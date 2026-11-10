import { useMemo, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, ArrowUpDown, Bookmark, Check, ChevronLeft, ChevronRight, GitCompareArrows, Heart, MapPin, Search, X } from 'lucide-react'
import { courses, destinations, type Course } from '../data/catalog'
import { PageIntro } from '../components/Layout'
import { supabase, supabaseConfigured } from '../lib/supabase'

const storageRead = (key: string): string[] => { try { const value: unknown = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string'))] : [] } catch { return [] } }
const storageWrite = (key: string, value: string[]) => { try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* Keep selections usable in memory when storage is unavailable. */ } }

function useSavedItems() {
  const [shortlist, setShortlist] = useState<string[]>(() => storageRead('wayfindr-shortlist'))
  const [compare, setCompare] = useState<string[]>(() => storageRead('wayfindr-compare').slice(0, 3))
  const saveShortlist = (next: string[]) => { setShortlist(next); storageWrite('wayfindr-shortlist', next) }
  const saveCompare = (next: string[]) => { setCompare(next); storageWrite('wayfindr-compare', next) }
  return { shortlist, compare, saveShortlist, saveCompare }
}

const mapPublishedCourse = (row: { slug: string; title: string; content: Record<string, unknown> }): Course => {
  const content = row.content && typeof row.content === 'object' && !Array.isArray(row.content) ? row.content : {}
  return {
    ...(content as unknown as Course), id: row.slug, program: String(content.program || content.subject || row.title),
    subject: String(content.subject || 'Subject not specified'), description: String(content.description || 'Published program information.'),
    fee: typeof content.fee === 'number' ? content.fee : null, feeCurrency: typeof content.feeCurrency === 'string' ? content.feeCurrency : '',
    feePeriod: typeof content.feePeriod === 'string' ? content.feePeriod : '',
    requirements: Array.isArray(content.requirements) ? content.requirements.map(String) : [],
    university: String(content.university || 'University details to be added'), universitySlug: String(content.universitySlug || ''),
    destination: String(content.destination || ''), destinationSlug: String(content.destinationSlug || ''),
    level: String(content.level || 'Master’s'), intake: String(content.intake || ''), city: String(content.city || ''),
    duration: String(content.duration || ''), sample: content.sample === true,
  }
}

const tuitionText = (course: Course) => course.fee === null ? 'Not supplied' : `${course.feeCurrency || ''} ${course.fee.toLocaleString()}${course.feePeriod ? ` / ${course.feePeriod}` : ''}`.trim()

export function ExplorerPage() {
  const [params, setParams] = useSearchParams()
  const { shortlist, compare, saveShortlist, saveCompare } = useSavedItems()
  const { data: publishedCourses } = useQuery({
    queryKey: ['published-content', 'course'], enabled: supabaseConfigured,
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase.from('content_items').select('title,slug,content').eq('content_type', 'course').eq('status', 'published').order('title')
      if (error) throw error
      return (data || []).map((row) => mapPublishedCourse(row as { title: string; slug: string; content: Record<string, unknown> }))
    },
  })
  const catalog = publishedCourses?.length ? publishedCourses : courses
  const [showCompare, setShowCompare] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const pageSize = 6
  const query = params.get('q') || ''
  const destination = params.get('destination') || ''
  const subject = params.get('subject') || ''
  const intake = params.get('intake') || ''
  const maxTuition = params.get('maxTuition') || ''
  const duration = params.get('duration') || ''
  const entry = params.get('entry') || ''
  const sort = params.get('sort') || 'program'
  const requestedPage = Number(params.get('page') || 1)
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value); else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next)
  }
  const subjects = [...new Set(catalog.map((course) => course.subject).filter(Boolean))].sort()
  const durations = [...new Set(catalog.map((course) => course.duration).filter(Boolean))].sort()
  const intakes = [...new Set(catalog.map((course) => course.intake).filter(Boolean))].sort()
  const entryOptions = [
    ['qualification', 'Prior bachelor’s qualification'], ['subject', 'Subject prerequisites'], ['english', 'English-language evidence'],
  ]
  const results = useMemo(() => {
    const searchText = (course: Course) => `${course.program} ${course.subject} ${course.university} ${course.destination} ${course.city} ${course.requirements.join(' ')}`.toLowerCase()
    return catalog.filter((course) =>
      (!query || searchText(course).includes(query.toLowerCase())) &&
      (!destination || course.destinationSlug === destination) &&
      (!subject || course.subject === subject) &&
      (!intake || course.intake.toLowerCase().includes(intake.toLowerCase())) &&
      (!duration || course.duration === duration) &&
      (!maxTuition || (course.fee !== null && course.fee <= Number(maxTuition))) &&
      (!entry || course.requirements.join(' ').toLowerCase().includes(entry)),
    ).sort((a, b) => sort === 'tuition' ? (a.fee ?? Infinity) - (b.fee ?? Infinity) : a.program.localeCompare(b.program))
  }, [catalog, query, destination, subject, intake, duration, maxTuition, entry, sort])
  const pages = Math.max(1, Math.ceil(results.length / pageSize))
  const currentPage = Math.min(page, pages)
  const pageResults = results.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const activeCount = [query, destination, subject, intake, maxTuition, duration, entry].filter(Boolean).length
  const clear = () => setParams({})
  const toggleShortlist = (id: string) => saveShortlist(shortlist.includes(id) ? shortlist.filter((value) => value !== id) : [...shortlist, id])
  const toggleCompare = (id: string) => {
    if (compare.includes(id)) saveCompare(compare.filter((value) => value !== id))
    else if (compare.length < 3) saveCompare([...compare, id])
  }
  const selected = compare.map((id) => catalog.find((course) => course.id === id)).filter((course): course is Course => Boolean(course))
  const savedCourses = shortlist.map((id) => catalog.find((course) => course.id === id)).filter((course): course is Course => Boolean(course))

  return <section className="section"><div className="wrap">
    <PageIntro eyebrow="Master’s program explorer" title="Find a postgraduate program to explore." text="Search and compare programs by country, subject, tuition, intake, duration, and items to verify for entry. Local examples are fictional; tuition and program requirements are not verified." />
    <div className="mb-6 flex flex-wrap gap-3"><button onClick={() => setShowSaved(!showSaved)} className="button-secondary"><Bookmark size={16}/> Shortlist <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{shortlist.length}</span></button><button onClick={() => setShowCompare(!showCompare)} className="button-secondary"><GitCompareArrows size={16}/> Compare <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{compare.length}/3</span></button></div>
    {(showCompare || showSaved) && <div className="mb-7 rounded-2xl border border-teal/20 bg-[#f7faf8] p-5"><div className="flex items-center justify-between"><h2 className="font-display font-bold text-navy">{showCompare ? 'Program comparison' : 'Your saved programs'}</h2><button aria-label="Close panel" onClick={() => { setShowCompare(false); setShowSaved(false) }}><X size={18}/></button></div>{showCompare ? (selected.length === 0 ? <p className="mt-3 text-sm text-slate-600">Add up to three programs from the results to compare them here.</p> : <div className="mt-4 overflow-x-auto"><table className="min-w-[700px] w-full text-left text-sm"><thead><tr>{['Program','Institution','Country','Duration','Tuition',''].map((heading) => <th key={heading} className="border-b border-slate-200 px-3 py-3 text-xs font-bold uppercase text-slate-500">{heading}</th>)}</tr></thead><tbody>{selected.map((course) => <tr key={course.id}><td className="px-3 py-3 font-semibold text-navy">{course.program}</td><td className="px-3 py-3">{course.university}</td><td className="px-3 py-3">{course.destination}</td><td className="px-3 py-3">{course.duration || 'Not supplied'}</td><td className="px-3 py-3">{tuitionText(course)}</td><td><button aria-label={`Remove ${course.program} from comparison`} onClick={() => toggleCompare(course.id)} className="text-slate-400 hover:text-red-600"><X size={16}/></button></td></tr>)}</tbody></table></div>) : savedCourses.length === 0 ? <p className="mt-3 text-sm text-slate-600">Your shortlist is empty. Save a program to find it here next time.</p> : <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{savedCourses.map((course) => <div className="flex items-center justify-between rounded-xl bg-white p-3" key={course.id}><Link to={`/courses/${course.id}`} className="text-sm font-semibold text-navy hover:text-teal">{course.program}<span className="block text-xs font-normal text-slate-500">{course.destination} · {course.sample ? 'sample' : 'published'}</span></Link><button aria-label={`Remove ${course.program} from shortlist`} onClick={() => toggleShortlist(course.id)} className="text-slate-400 hover:text-red-600"><X size={16}/></button></div>)}</div>}</div>}
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">Sample programs and institutions are fictional demonstrations. Tuition is not supplied. Entry filter terms identify items to verify—not confirmed admission requirements.</div>
    <div className="grid items-start gap-8 lg:grid-cols-[270px_1fr]"><aside className="rounded-2xl border border-slate-100 bg-slate-50 p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-display font-bold text-navy">Filters {activeCount > 0 && <span className="rounded-full bg-teal px-2 py-0.5 text-xs text-white">{activeCount}</span>}</h2>{activeCount > 0 && <button onClick={clear} className="text-xs font-bold text-teal">Clear all</button>}</div>
      <label className="mb-4 block"><span className="label">Search programs</span><span className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={(event) => update('q', event.target.value)} className="form-control !pl-9" placeholder="Degree, subject, institution"/></span></label>
      <label className="mb-4 block"><span className="label">Country</span><select className="form-control" value={destination} onChange={(event) => update('destination', event.target.value)}><option value="">All countries</option>{destinations.map((item) => <option value={item.slug} key={item.slug}>{item.name}</option>)}</select></label>
      <label className="mb-4 block"><span className="label">Subject</span><select className="form-control" value={subject} onChange={(event) => update('subject', event.target.value)}><option value="">All subjects</option>{subjects.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label className="mb-4 block"><span className="label">Tuition maximum</span><input type="number" min="0" inputMode="decimal" value={maxTuition} onChange={(event) => update('maxTuition', event.target.value)} className="form-control" placeholder="Amount (verified listings only)"/><span className="mt-1 block text-xs text-slate-500">Currency depends on country. Unknown fees do not match.</span></label>
      <label className="mb-4 block"><span className="label">Intake</span><select className="form-control" value={intake} onChange={(event) => update('intake', event.target.value)}><option value="">Any intake</option>{intakes.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label className="mb-4 block"><span className="label">Duration</span><select className="form-control" value={duration} onChange={(event) => update('duration', event.target.value)}><option value="">Any duration</option>{durations.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label className="block"><span className="label">Entry requirements to check</span><select className="form-control" value={entry} onChange={(event) => update('entry', event.target.value)}><option value="">Any criteria</option>{entryOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    </aside>
    <div><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><p aria-live="polite" className="text-sm text-slate-600"><strong className="text-navy">{results.length}</strong> {results.length === 1 ? 'program' : 'programs'}</p><label className="flex items-center gap-2 text-sm text-slate-600"><ArrowUpDown size={16}/><span>Sort by</span><select className="form-control !w-auto !py-2" value={sort} onChange={(event) => update('sort', event.target.value)}><option value="program">Program</option><option value="tuition">Tuition (unknown last)</option></select></label></div>
      {pageResults.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center"><Search className="mx-auto text-slate-400"/><h2 className="mt-4 font-display text-xl font-bold text-navy">No programs match yet</h2><p className="mt-2 text-sm text-slate-600">Try changing your search or clearing one of the filters.</p><button onClick={clear} className="button-secondary mt-5">Clear all filters</button></div> : <div className="grid gap-4 md:grid-cols-2">{pageResults.map((course) => <article key={course.id} className="card flex flex-col p-5"><div className="flex items-start justify-between gap-3"><span className="rounded-full bg-amber-50 px-3 py-1 text-[10px] font-bold tracking-wider text-amber-800">{course.sample ? 'SAMPLE · FICTIONAL' : 'PUBLISHED · VERIFY WITH PROVIDER'}</span><button aria-label={shortlist.includes(course.id) ? 'Remove from shortlist' : 'Add to shortlist'} onClick={() => toggleShortlist(course.id)} className={`rounded-full p-2 ${shortlist.includes(course.id) ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400 hover:text-rose-500'}`}><Heart size={17} fill={shortlist.includes(course.id) ? 'currentColor' : 'none'}/></button></div><Link to={`/courses/${course.id}`} className="mt-4 font-display text-xl font-bold text-navy hover:text-teal">{course.program}</Link><p className="mt-1 text-sm font-medium text-slate-600">{course.university}</p><p className="mt-3 flex items-center gap-1 text-xs text-slate-500"><MapPin size={14}/>{course.city ? `${course.city}, ` : ''}{course.destination || 'Country not supplied'}</p><dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-xs"><div><dt className="text-slate-500">Subject</dt><dd className="mt-1 font-semibold text-navy">{course.subject}</dd></div><div><dt className="text-slate-500">Duration</dt><dd className="mt-1 font-semibold text-navy">{course.duration || 'Not supplied'}</dd></div><div><dt className="text-slate-500">Intake</dt><dd className="mt-1 font-semibold text-navy">{course.intake || 'Not supplied'}</dd></div><div><dt className="text-slate-500">Tuition</dt><dd className="mt-1 font-semibold text-navy">{tuitionText(course)}</dd></div></dl><p className="mt-4 line-clamp-2 text-xs leading-5 text-slate-600">Items to verify: {course.requirements.slice(0, 2).join(' · ') || 'Check the university program page.'}</p><div className="mt-auto flex items-center justify-between pt-5"><button disabled={!compare.includes(course.id) && compare.length >= 3} onClick={() => toggleCompare(course.id)} className="inline-flex items-center gap-2 text-xs font-semibold text-teal disabled:opacity-50"><GitCompareArrows size={15}/>{compare.includes(course.id) ? 'Remove compare' : 'Compare'}</button><Link to={`/courses/${course.id}`} className="inline-flex items-center gap-1 text-xs font-bold text-teal">Details <ArrowRight size={14}/></Link></div></article>)}</div>}
      {pages > 1 && <nav aria-label="Program results pages" className="mt-7 flex items-center justify-center gap-3"><button disabled={currentPage === 1} onClick={() => update('page', String(currentPage - 1))} className="button-secondary !px-3 disabled:opacity-40"><ChevronLeft size={17}/> Previous</button><span className="text-sm text-slate-600">Page {currentPage} of {pages}</span><button disabled={currentPage === pages} onClick={() => update('page', String(currentPage + 1))} className="button-secondary !px-3 disabled:opacity-40">Next <ChevronRight size={17}/></button></nav>}
    </div></div></div></section>
}

function CourseDetail({ course }: { course: Course }) {
  const { shortlist, compare, saveShortlist, saveCompare } = useSavedItems()
  const saved = shortlist.includes(course.id)
  const comparing = compare.includes(course.id)
  const destination = destinations.find((item) => item.slug === course.destinationSlug)
  return <section className="section"><div className="wrap max-w-4xl"><Link className="text-sm font-semibold text-teal" to="/explore">← Back to program explorer</Link><p className="eyebrow mb-3 mt-8">{course.sample ? 'Fictional demonstration program' : 'Published program details'}</p><h1 className="heading">{course.program}</h1><p className="mt-3 text-lg text-slate-600">{course.university}</p><div className="mt-6 flex flex-wrap gap-3"><button className="button-secondary" onClick={() => saveShortlist(saved ? shortlist.filter((id) => id !== course.id) : [...shortlist, course.id])}><Heart size={16} fill={saved ? 'currentColor' : 'none'}/>{saved ? 'Saved to shortlist' : 'Add to shortlist'}</button><button disabled={!comparing && compare.length >= 3} className="button-secondary disabled:opacity-50" onClick={() => saveCompare(comparing ? compare.filter((id) => id !== course.id) : [...compare, course.id])}><GitCompareArrows size={16}/>{comparing ? 'Remove from comparison' : 'Compare program'}</button></div><div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">{course.sample ? 'This degree, institution, duration, and illustrative criteria are fictional sample data. This is not a real listing, partnership, admission requirement, fee, or offer.' : 'Published information is provided for discovery only. Confirm all current program facts, entry requirements, dates, and fees directly with the institution.'}</div><div className="mt-8 grid gap-8 md:grid-cols-[1fr_.8fr]"><div><h2 className="subheading">Program overview</h2><p className="mt-3 leading-7 text-slate-600">{course.description}</p><h2 className="subheading mt-8">Items to verify for entry</h2><ul className="mt-3 space-y-3">{course.requirements.map((requirement) => <li className="flex gap-2 text-sm leading-6 text-slate-600" key={requirement}><Check size={17} className="mt-1 shrink-0 text-teal"/>{requirement}</li>)}</ul><p className="mt-3 text-xs text-slate-500">These are general checks, not confirmed admission requirements.</p>{destination && <p className="mt-7 text-sm leading-6 text-slate-600">Country guide: <Link className="font-bold text-teal" to={`/destinations/${destination.slug}`}>{destination.name}</Link></p>}</div><aside className="card h-fit p-6"><h2 className="font-display text-lg font-bold text-navy">Program details</h2><dl className="mt-4 space-y-4 text-sm"><div><dt className="text-slate-500">Country</dt><dd className="mt-1 font-semibold text-navy">{course.destination || 'Not supplied'}</dd></div><div><dt className="text-slate-500">Subject</dt><dd className="mt-1 font-semibold text-navy">{course.subject}</dd></div><div><dt className="text-slate-500">Duration</dt><dd className="mt-1 font-semibold text-navy">{course.duration || 'Not supplied'}</dd></div><div><dt className="text-slate-500">Tuition</dt><dd className="mt-1 font-semibold text-navy">{tuitionText(course)}</dd></div><div><dt className="text-slate-500">Intake</dt><dd className="mt-1 font-semibold text-navy">{course.intake || 'Not supplied'}</dd></div></dl><Link to="/consultation" className="button-primary mt-6 w-full">Discuss your master’s plans <ArrowRight size={16}/></Link></aside></div></div></section>
}

export function CoursePage() {
  const { id } = useParams()
  const { data: published, isLoading, isError, refetch } = useQuery({
    queryKey: ['published-content', 'course', id], enabled: Boolean(supabaseConfigured && id),
    queryFn: async () => {
      if (!supabase || !id) return null
      const { data, error } = await supabase.from('content_items').select('title,slug,content').eq('content_type', 'course').eq('status', 'published').eq('slug', id).maybeSingle()
      if (error) throw error
      return data ? mapPublishedCourse(data as { title: string; slug: string; content: Record<string, unknown> }) : null
    },
  })
  const course = published || courses.find((item) => item.id === id)
  if (isLoading && !course) return <div role="status" className="p-12 text-center text-slate-500">Loading program details…</div>
  if (isError) return <QueryFailure onRetry={() => { void refetch() }}/>
  return course ? <CourseDetail course={course}/> : <Navigate to="/404" replace/>
}

export function UniversityPage() {
  const { slug } = useParams()
  const { data: published, isLoading, isError, refetch } = useQuery({
    queryKey: ['published-content', 'university', slug], enabled: Boolean(supabaseConfigured && slug),
    queryFn: async () => {
      if (!supabase || !slug) return null
      const { data, error } = await supabase.from('content_items').select('title,slug,content').eq('content_type', 'university').eq('status', 'published').eq('slug', slug).maybeSingle()
      if (error) throw error
      return data ? { title: data.title, slug: data.slug, content: data.content && typeof data.content === 'object' && !Array.isArray(data.content) ? data.content as Record<string, unknown> : {} } : null
    },
  })
  const sample = courses.find((course) => course.universitySlug === slug)
  if (isLoading && !sample) return <div role="status" className="p-12 text-center text-slate-500">Loading institution profile…</div>
  if (isError) return <QueryFailure onRetry={() => { void refetch() }}/>
  if (published) return <section className="section"><div className="wrap max-w-4xl"><p className="eyebrow">Published institution information</p><h1 className="heading mt-3">{published.title}</h1><p className="mt-4 text-lg leading-7 text-slate-600">{String(published.content.description || 'More institution information is being prepared.')}</p><div className="mt-8 rounded-2xl bg-[#f7faf8] p-6"><p className="text-xs font-bold uppercase text-slate-500">Location</p><p className="mt-2 font-semibold text-navy">{String(published.content.location || 'Not provided')}</p><p className="mt-5 text-xs text-slate-500">Confirm current institution and program details directly with the provider.</p></div><Link to="/consultation" className="button-primary mt-8">Ask about your options <ArrowRight size={16}/></Link></div></section>
  if (!sample) return <Navigate to="/404" replace/>
  const matches = courses.filter((course) => course.universitySlug === slug)
  return <section className="section"><div className="wrap max-w-4xl"><p className="eyebrow">Fictional demonstration institution</p><h1 className="heading mt-3">{sample.university}</h1><p className="mt-4 text-lg text-slate-600">Example profile only—this is not a real institution or partnership.</p><div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">All institution details are invented demonstration content. No affiliation, current programs, fees, admission criteria, or offers are represented.</div><p className="mt-8 flex items-center gap-2 text-slate-600"><MapPin size={17}/>{sample.destination}</p><h2 className="subheading mt-8">Example master’s programs</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{matches.map((course) => <Link className="card p-5" to={`/courses/${course.id}`} key={course.id}><span className="text-[10px] font-bold text-teal">FICTIONAL SAMPLE</span><h3 className="mt-2 font-bold text-navy">{course.program}</h3><p className="mt-1 text-sm text-slate-500">{course.duration} · tuition not supplied</p></Link>)}</div><Link to="/consultation" className="button-primary mt-8">Explore postgraduate options <ArrowRight size={16}/></Link></div></section>
}

function QueryFailure({ onRetry }: { onRetry: () => void }) {
  return <section className="section"><div className="wrap" role="alert"><h1 className="heading">We couldn’t load this page.</h1><button className="button-primary mt-5" onClick={onRetry}>Try again</button></div></section>
}
