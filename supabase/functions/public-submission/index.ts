import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || 'http://localhost:5173',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
}
const reply = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
const clean = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : ''

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return reply({ saved: false, message: 'Method not allowed.' }, 405)
  const origin = req.headers.get('origin')
  const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') || 'http://localhost:5173'
  if (origin && allowedOrigin !== '*' && origin !== allowedOrigin) return reply({ saved: false, message: 'Origin not allowed.' }, 403)
  const length = Number(req.headers.get('content-length') || '0')
  if (length > 16_384) return reply({ saved: false, message: 'Request is too large.' }, 413)
  let body: { kind?: unknown; payload?: Record<string, unknown> }
  try {
    const reader = req.body?.getReader()
    if (!reader) return reply({ saved: false, message: 'Invalid request.' }, 400)
    const chunks: Uint8Array[] = []
    let size = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 16_384) { await reader.cancel(); return reply({ saved: false, message: 'Request is too large.' }, 413) }
      chunks.push(value)
    }
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
    body = JSON.parse(new TextDecoder().decode(bytes))
  } catch { return reply({ saved: false, message: 'Invalid request.' }, 400) }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return reply({ saved: false, message: 'Invalid request.' }, 400)
  if (!body.payload || typeof body.payload !== 'object' || Array.isArray(body.payload)) return reply({ saved: false, message: 'Invalid request data.' }, 400)
  const kind = body.kind
  if (kind !== 'consultation' && kind !== 'contact') return reply({ saved: false, message: 'Invalid request type.' }, 400)
  const raw = body.payload
  if (clean(raw.website, 200)) return reply({ saved: false, message: 'Unable to accept this request.' }, 400)
  const fullName = clean(raw.fullName, 120)
  const email = clean(raw.email, 254).toLowerCase()
  const phone = clean(raw.phone, 32)
  const message = clean(raw.message, 2000)
  const consent = raw.consent === true
  const marketingConsent = raw.marketingConsent === true
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const phonePattern = /^\+?[0-9 ()-]{7,32}$/
  if (fullName.length < 2 || !emailPattern.test(email) || !phonePattern.test(phone) || phone.replace(/\D/g, '').length < 7 || !consent) return reply({ saved: false, message: 'Check the required name, email, phone, and consent fields.' }, 400)

  const storedPayload: Record<string, unknown> = { fullName, email, phone, message, consent, marketingConsent }
  if (kind === 'consultation') {
    const undergraduateQualification = clean(raw.undergraduateQualification, 300)
    const intendedSubject = clean(raw.intendedSubject, 120)
    const preferredCountries = Array.isArray(raw.preferredCountries)
      ? raw.preferredCountries.filter((value): value is string => typeof value === 'string').map((value) => clean(value, 80)).slice(0, 8)
      : []
    const allowedCountries = ['United Kingdom', 'Australia', 'New Zealand', 'United States', 'Canada', 'Ireland', 'Germany', 'Not sure yet']
    const validCountries = preferredCountries.length > 0
      && preferredCountries.every((country) => allowedCountries.includes(country))
      && (!preferredCountries.includes('Not sure yet') || preferredCountries.length === 1)
    const budget = clean(raw.budget, 100)
    const intake = clean(raw.intake, 80)
    const appointment = clean(raw.appointment, 80)
    if (undergraduateQualification.length < 2 || intendedSubject.length < 2 || !validCountries || budget.length < 2 || !['Next available intake', 'Within 6–12 months', 'More than 12 months', 'Not sure yet'].includes(intake)) return reply({ saved: false, message: 'Check the required postgraduate study preference fields.' }, 400)
    if (appointment && (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(appointment) || Number.isNaN(Date.parse(appointment)))) return reply({ saved: false, message: 'Preferred appointment time is invalid.' }, 400)
    Object.assign(storedPayload, { undergraduateQualification, intendedSubject, preferredCountries, budget, intake, preferredAppointment: appointment || null })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) return reply({ saved: false, message: 'Request storage is not configured. Please contact WayFindr another way.' }, 503)
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const salt = Deno.env.get('RATE_LIMIT_SALT') || serviceKey
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${forwarded}`))
  const ipHash = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
  const { data: allowed, error: limitError } = await admin.rpc('consume_public_submission_limit', { p_ip_hash: ipHash })
  if (limitError) { console.error('Rate limiter failed', limitError.message); return reply({ saved: false, message: 'Request protection is temporarily unavailable. Please try again later.' }, 503) }
  if (!allowed) return reply({ saved: false, message: 'Too many requests. Please try again later.' }, 429)

  const { data: saved, error: saveError } = await admin.from('private_requests').insert({ kind, payload: storedPayload }).select('id').single()
  if (saveError || !saved) { console.error('Request save failed', saveError?.message); return reply({ saved: false, message: 'We could not save your request. Please try again later.' }, 500) }

  let emailSent = false
  const emailKey = Deno.env.get('RESEND_API_KEY')
  const notificationEmail = Deno.env.get('NOTIFICATION_EMAIL')
  if (emailKey && notificationEmail) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST', signal: AbortSignal.timeout(10_000), headers: { Authorization: `Bearer ${emailKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: Deno.env.get('EMAIL_FROM') || 'WayFindr <onboarding@resend.dev>', to: [notificationEmail], subject: `New ${kind} request`, text: `A new ${kind} request was saved. Reference: ${saved.id}. Review it in the protected WayFindr admin dashboard.` }),
      })
      emailSent = response.ok
      if (!response.ok) console.error('Email provider returned', response.status)
    } catch (error) { console.error('Email notification failed', error) }
    if (!emailSent) await admin.from('private_requests').update({ email_sent: false }).eq('id', saved.id)
    else await admin.from('private_requests').update({ email_sent: true }).eq('id', saved.id)
  }
  return reply({ saved: true, emailSent, message: emailSent ? 'Your request was saved.' : 'Your request was saved; email notification is unavailable.' }, 201)
})