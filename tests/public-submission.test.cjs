const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

const compiled = ts.transpileModule(fs.readFileSync('supabase/functions/public-submission/index.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

function setup() {
  let handler
  let stored
  const client = {
    rpc: async () => ({ data: true, error: null }),
    from: () => ({ insert: (value) => { stored = value; return { select: () => ({ single: async () => ({ data: { id: 'test' }, error: null }) }) } } }),
  }
  vm.runInNewContext(compiled, {
    exports: {}, require: () => ({ createClient: () => client }),
    Deno: { env: { get: (key) => ({ SUPABASE_URL: 'https://example.test', SUPABASE_SERVICE_ROLE_KEY: 'test-key' })[key] }, serve: (fn) => { handler = fn } },
    Request, Response, TextEncoder, TextDecoder, Uint8Array, crypto, console, AbortSignal,
  })
  return { handler, stored: () => stored }
}
const contact = { kind: 'contact', payload: { fullName: 'Test Student', email: 'student@example.com', phone: '+1 555 123 4567', consent: true } }
const request = (body) => new Request('https://example.test', { method: 'POST', body: JSON.stringify(body) })

test('rejects null, arrays, and malformed JSON without throwing', async () => {
  const { handler } = setup()
  for (const value of [null, [], 42, {}, { kind: 'contact', payload: [] }]) assert.equal((await handler(request(value))).status, 400)
  assert.equal((await handler(new Request('https://example.test', { method: 'POST', body: '{' }))).status, 400)
})

test('enforces the byte limit even without Content-Length', async () => {
  const { handler } = setup()
  assert.equal((await handler(request({ ...contact, extra: 'x'.repeat(17000) }))).status, 413)
})

test('rejects punctuation-only phone numbers and missing consent', async () => {
  const { handler } = setup()
  for (const fields of [{ phone: '-------' }, { consent: false }]) {
    assert.equal((await handler(request({ ...contact, payload: { ...contact.payload, ...fields } }))).status, 400)
  }
})

test('stores valid contact data and discards unknown fields', async () => {
  const { handler, stored } = setup()
  const response = await handler(request({ ...contact, payload: { ...contact.payload, admin: true } }))
  assert.equal(response.status, 201)
  assert.equal((await response.json()).saved, true)
  assert.equal(stored().payload.admin, undefined)
})

test('requires an unambiguous appointment timestamp and a supported intake', async () => {
  const { handler, stored } = setup()
  const payload = { ...contact.payload, undergraduateQualification: 'BSc', intendedSubject: 'Computing', preferredCountries: ['Canada'], budget: 'Not sure yet', intake: 'Not sure yet', appointment: '2026-11-01T10:00:00.000Z' }
  assert.equal((await handler(request({ kind: 'consultation', payload }))).status, 201)
  assert.equal(stored().payload.preferredAppointment, payload.appointment)
  for (const fields of [{ appointment: '2026-11-01T10:00' }, { intake: 'arbitrary' }, { preferredCountries: ['Canada', 'Not sure yet'] }]) {
    assert.equal((await handler(request({ kind: 'consultation', payload: { ...payload, ...fields } }))).status, 400)
  }
})
