import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { ArrowUpRight, Menu, X } from 'lucide-react'
import { business, isConfigured } from '../config/business'

const links = [
  ['Destinations', '/destinations'], ['Master’s programs', '/explore'], ['Our services', '/services'], ['Resources', '/resources'], ['About us', '/about'],
]

export function Layout() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const lastSegment = location.pathname.split('/').filter(Boolean).slice(-1)[0]
  const label = lastSegment?.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) ?? 'WayFindr'
  const title = location.pathname === '/' ? 'WayFindr — Find Your Way to a Master’s Abroad' : `${label} | WayFindr`
  const descriptions: Record<string,string> = {
    '/': 'Explore master’s programs, compare your options, and plan your next step with postgraduate study guidance from WayFindr.',
    '/about': 'Meet WayFindr and learn about our student-first approach to postgraduate study planning.',
    '/destinations': 'Explore master’s study destinations, postgraduate options, and official source links.',
    '/services': 'Explore master’s shortlisting, eligibility, application, scholarship, visa preparation, and pre-departure support.',
    '/explore': 'Search and compare master’s program examples by country, subject, tuition, intake, duration, and entry criteria.',
    '/consultation': 'Request a WayFindr postgraduate consultation and share your master’s study goals.',
    '/contact': 'Contact WayFindr with questions about master’s destinations, programs, and application guidance.',
    '/resources': 'Browse sample master’s application checklists, funding guides, and postgraduate FAQs.',
    '/privacy': 'Read the WayFindr privacy notice draft. This page requires legal review before launch.',
    '/terms': 'Read the WayFindr terms of use draft. This page requires legal review before launch.',
  }
  const desc = descriptions[location.pathname] ?? (location.pathname.startsWith('/destinations/') ? `Explore postgraduate study, application considerations, and official source links for ${label}.` : location.pathname.startsWith('/courses/') ? 'Review this WayFindr master’s program explorer entry. Sample listings are fictional and require verification.' : 'Explore master’s study destinations, compare programs, and plan your postgraduate next step with WayFindr.')
  useEffect(() => {
    window.scrollTo(0, 0)
    setOpen(false)
  }, [location.pathname])
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.title = title
    let meta = document.querySelector('meta[name="description"]')
    if (!meta) { meta = document.createElement('meta'); meta.setAttribute('name', 'description'); document.head.append(meta) }
    meta.setAttribute('content', desc)
    for (const [property, content] of [['og:title', title], ['og:description', desc], ['twitter:card', 'summary_large_image'], ['twitter:title', title], ['twitter:description', desc]]) {
      let tag = document.querySelector(`meta[property="${property}"]`) || document.querySelector(`meta[name="${property}"]`)
      if (!tag) { tag = document.createElement('meta'); tag.setAttribute(property.startsWith('og:') ? 'property' : 'name', property); document.head.append(tag) }
      tag.setAttribute('content', content)
    }
    let canonical = document.querySelector('link[rel="canonical"]')
    if (!canonical) { canonical = document.createElement('link'); canonical.setAttribute('rel', 'canonical'); document.head.append(canonical) }
    canonical.setAttribute('href', `${import.meta.env.VITE_SITE_URL || window.location.origin}${location.pathname}`)
  }, [title, desc, location.pathname])
  return <>
    <a className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-white focus:px-4 focus:py-3" href="#main">Skip to content</a>
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur-md">
      <div className="wrap flex h-[76px] items-center justify-between px-5 lg:px-0">
        <Link aria-label="WayFindr home" to="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-navy text-white"><span className="text-[21px] font-bold">W</span></span>
          <span className="font-display text-[21px] font-extrabold tracking-[-.05em] text-navy">wayfindr<span className="text-teal">.</span></span>
        </Link>
        <nav className="hidden items-center gap-7 lg:flex" aria-label="Main navigation">
          {links.map(([label, to]) => <NavLink key={to} to={to} className={({ isActive }) => `text-[13px] font-semibold transition-colors hover:text-teal ${isActive ? 'text-teal' : 'text-slate-600'}`}>{label}</NavLink>)}
        </nav>
        <div className="hidden items-center gap-5 lg:flex"><Link to="/consultation" className="button-primary !min-h-[44px] !px-5 !text-[13px]">Book a Free Consultation <ArrowUpRight size={15} /></Link></div>
        <button aria-expanded={open} aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(!open)} className="rounded-lg p-2 text-navy hover:bg-slate-100 lg:hidden">{open ? <X /> : <Menu />}</button>
      </div>
      {open && <nav aria-label="Mobile navigation" className="border-t border-slate-100 bg-white px-5 pb-5 pt-3 lg:hidden">
        {links.map(([label, to]) => <NavLink key={to} to={to} onClick={() => setOpen(false)} className="block border-b border-slate-100 py-3 text-sm font-semibold text-slate-700">{label}</NavLink>)}
        <Link to="/consultation" onClick={() => setOpen(false)} className="button-primary mt-4 w-full">Book a Free Consultation</Link>
      </nav>}
    </header>
    <main id="main"><Outlet /></main>
    <footer className="bg-navy text-white">
      <div className="wrap grid gap-12 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr] lg:px-0">
        <div><Link to="/" className="font-display text-2xl font-extrabold tracking-tight">wayfindr<span className="text-teal">.</span></Link><p className="mt-3 max-w-sm text-sm leading-6 text-slate-300">Find Your Way to a Master’s Abroad.<br />Thoughtful postgraduate guidance for your next chapter.</p><Link to="/consultation" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#9bd9cb]">Let’s plan your next step <ArrowUpRight size={15} /></Link></div>
        <div><p className="text-xs font-bold uppercase tracking-[.15em] text-slate-400">Explore</p><div className="mt-4 grid gap-3 text-sm text-slate-200">{[['Destinations','/destinations'],['Master’s programs','/explore'],['Services','/services'],['Resources & FAQs','/resources'],['About WayFindr','/about']].map(([label,to])=><Link key={to} to={to} className="hover:text-white">{label}</Link>)}</div></div>
        <div><p className="text-xs font-bold uppercase tracking-[.15em] text-slate-400">Get in touch</p><div className="mt-4 grid gap-3 text-sm text-slate-200"><Link to="/contact" className="hover:text-white">Contact us</Link>{isConfigured(business.email) && <a href={`mailto:${business.email}`}>{business.email}</a>}{isConfigured(business.phone) && <a href={`tel:${business.phone}`}>{business.phone}</a>}<p className="text-slate-400">Contact details are added here when configured.</p></div></div>
      </div>
      <div className="border-t border-white/10"><div className="wrap flex flex-col gap-3 px-5 py-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between lg:px-0"><span>© {new Date().getFullYear()} WayFindr. All rights reserved.</span><div className="flex gap-5"><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/admin/login">Admin</Link></div></div></div>
    </footer>
  </>
}

export function PageIntro({ eyebrow, title, text }: { eyebrow?: string; title: string; text?: string }) {
  return <div className="mb-10 max-w-3xl">{eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}<h1 className="heading">{title}</h1>{text && <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">{text}</p>}</div>
}

export function Photo({ id, alt, className = '', loading = 'lazy' }: { id: string; alt: string; className?: string; loading?: 'lazy' | 'eager' }) {
  const src = id.startsWith('/') ? id : `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`
  return <img src={src} alt={alt} loading={loading} onError={(event) => { event.currentTarget.style.display = 'none'; event.currentTarget.parentElement?.classList.add('image-fallback') }} className={`h-full w-full object-cover ${className}`} />
}