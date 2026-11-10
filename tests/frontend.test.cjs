const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const React = require('react')
const { renderToString } = require('react-dom/server')
const { MemoryRouter } = require('react-router-dom')
const { QueryClient, QueryClientProvider } = require('@tanstack/react-query')

function load(relative, storage = '[]', cache = new Map(), queryState) {
  const file = path.resolve(relative)
  if (cache.has(file)) return cache.get(file).exports
  const module = { exports: {} }
  cache.set(file, module)
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8').replaceAll('import.meta.env', '({})'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
  vm.runInNewContext(compiled, {
    module, exports: module.exports, URLSearchParams, Intl, Date,
    localStorage: { getItem: () => storage },
    require: (specifier) => {
      if (specifier.endsWith('/lib/supabase')) return { supabase: null, supabaseConfigured: false }
      if (specifier === '@tanstack/react-query' && queryState) return { ...require(specifier), useQuery: () => ({ refetch: () => Promise.resolve(), ...queryState }) }
      if (!specifier.startsWith('.')) return require(specifier)
      const base = path.resolve(path.dirname(file), specifier)
      return load(fs.existsSync(base + '.tsx') ? base + '.tsx' : base + '.ts', storage, cache, queryState)
    },
  }, { filename: file })
  return module.exports
}
function render(Component, url = '/explore') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  // MemoryRouter uses layout effects in browsers; these SSR-only checks intentionally omit them.
  const original = console.error
  console.error = (...args) => { if (!String(args[0]).includes('useLayoutEffect does nothing on the server')) original(...args) }
  try {
    return renderToString(React.createElement(QueryClientProvider, { client }, React.createElement(MemoryRouter, { initialEntries: [url] }, React.createElement(Component))))
  } finally { console.error = original; client.clear() }
}

test('explorer renders results with invalid saved data and page parameters', () => {
  for (const storage of ['null', '{}', '"wrong"', '[null,42,"demo-01","demo-01"]', '{']) {
    const { ExplorerPage } = load('src/pages/ExplorerPages.tsx', storage)
    for (const page of ['NaN', 'Infinity', '-1', '1.5']) {
      const html = render(ExplorerPage, '/explore?page=' + page)
      assert.match(html, /Details/)
      assert.doesNotMatch(html, /Page NaN/)
    }
  }
})

test('request form labels point at actual inputs', () => {
  const { ConsultationPage, ContactPage } = load('src/pages/FormsPages.tsx')
  const html = render(ConsultationPage, '/consultation')
  for (const field of ['fullName', 'email', 'phone', 'undergraduateQualification', 'intendedSubject', 'budget', 'intake', 'appointment', 'message']) {
    assert.ok(html.includes(`for="${field}"`))
    assert.match(html, new RegExp(`<(?:input|select|textarea)[^>]*id="${field}"`))
  }
  assert.match(render(ContactPage, '/contact'), /How can we help/)
})

test('catalogs satisfy published schemas; malformed arrays and unsafe URLs are rejected', () => {
  const { destinationSchema, resourceSchema } = load('src/lib/publishedContent.ts')
  const { destinations, resources } = load('src/data/catalog.ts')
  for (const item of destinations) assert.ok(destinationSchema.safeParse(item).success)
  for (const item of resources) assert.ok(resourceSchema.safeParse(item).success)
  assert.equal(destinationSchema.safeParse({ ...destinations[0], subjects: 'Invalid' }).success, false)
  assert.equal(resourceSchema.safeParse({ ...resources[0], sources: [{ label: 'Unsafe', topic: 'Test', url: 'javascript:alert(1)' }] }).success, false)
})

test('marketing pages render without backend configuration and legal drafts do not invent review dates', () => {
  const pages = load('src/pages/MarketingPages.tsx')
  for (const name of ['HomePage', 'AboutPage', 'ServicesPage', 'DestinationsPage', 'ResourcesPage']) assert.ok(render(pages[name]).length > 500)
  assert.match(render(() => React.createElement(pages.DraftLegalPage, { kind: 'privacy' }), '/privacy'), /Last reviewed: Not yet reviewed/)
})

 test('detail pages distinguish loading and failures from missing content', () => {
  for (const [file, names] of [
    ['src/pages/MarketingPages.tsx', ['DestinationDetailPage', 'ResourceDetailPage']],
    ['src/pages/ExplorerPages.tsx', ['CoursePage', 'UniversityPage']],
  ]) {
    for (const name of names) {
      const pending = load(file, '[]', new Map(), { isLoading: true })
      assert.match(render(pending[name]), /Loading/)
      const failed = load(file, '[]', new Map(), { isError: true })
      assert.match(render(failed[name]), /Try again/)
      assert.doesNotMatch(render(failed[name]), /Page not found/)
    }
  }
})
