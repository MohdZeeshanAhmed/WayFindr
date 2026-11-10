import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const supabaseConfigured = Boolean(url && key && !url.includes('YOUR_PROJECT') && !key.includes('YOUR_'))
export const supabase = supabaseConfigured ? createClient(url!, key!) : null

export async function submitRequest(kind: 'consultation' | 'contact', payload: Record<string, unknown>) {
  if (!supabase) throw new Error('Request submissions are unavailable because the backend is not configured.')
  const { data, error } = await supabase.functions.invoke('public-submission', { body: { kind, payload } })
  if (error) throw new Error(error.message || 'We could not save your request. Please try again.')
  if (!data?.saved) throw new Error(data?.message || 'We could not save your request. Please try again.')
  return data as { saved: true; emailSent?: boolean }
}

export type ContentRecord = { id: string; title: string; slug: string; status: 'draft' | 'published'; content: Record<string, unknown> }