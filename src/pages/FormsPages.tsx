import { useState } from 'react'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { AlertCircle, ArrowRight, CheckCircle2, Clock3 } from 'lucide-react'
import { PageIntro } from '../components/Layout'
import { submitRequest, supabaseConfigured } from '../lib/supabase'
import { destinations } from '../data/catalog'
import { business, isConfigured } from '../config/business'

const createSchema = (kind: 'consultation'|'contact') => z.object({
  fullName: z.string().trim().min(2, 'Please enter your full name.').max(120, 'Name must be under 120 characters.'),
  email: z.string().trim().email('Enter a valid email address.').max(254),
  phone: z.string().trim().min(7, 'Include your country code and phone number.').max(32, 'Phone number is too long.').regex(/^\+?[0-9 ()-]+$/, 'Use digits, spaces, and an optional leading +.').refine((value) => value.replace(/\D/g, '').length >= 7, 'Enter at least seven digits.'),
  undergraduateQualification: z.string().trim().max(300).optional(),
  intendedSubject: z.string().trim().max(120).optional(),
  preferredCountries: z.array(z.string()).max(8).optional(),
  budget: z.string().trim().max(100).optional(),
  intake: z.string().optional(),
  appointment: z.string().refine((value) => !value || Number.isFinite(new Date(value).getTime()), 'Enter a valid appointment date and time.').optional(),
  message: z.string().max(2000, 'Message must be under 2,000 characters.').optional(),
  consent: z.boolean().refine((value) => value, 'Consent is required so we can respond to your inquiry.'),
  marketingConsent: z.boolean().optional(),
  website: z.string().max(0).optional(),
}).superRefine((values,context)=>{
  if(kind==='consultation'){
    if(!values.undergraduateQualification||values.undergraduateQualification.trim().length<2)context.addIssue({code:z.ZodIssueCode.custom,path:['undergraduateQualification'],message:'Tell us about your undergraduate qualification or select “Not sure yet.”'})
    if(!values.preferredCountries?.length)context.addIssue({code:z.ZodIssueCode.custom,path:['preferredCountries'],message:'Choose at least one country or select “Not sure yet.”'})
    if(values.preferredCountries?.includes('Not sure yet')&&values.preferredCountries.length>1)context.addIssue({code:z.ZodIssueCode.custom,path:['preferredCountries'],message:'Choose “Not sure yet” by itself, or select one or more countries.'})
    if(!values.intendedSubject||values.intendedSubject.trim().length<2)context.addIssue({code:z.ZodIssueCode.custom,path:['intendedSubject'],message:'Tell us your intended master’s subject or select “Not sure yet.”'})
    if(!values.budget||values.budget.trim().length<2)context.addIssue({code:z.ZodIssueCode.custom,path:['budget'],message:'Share a budget range and currency or select “Not sure yet.”'})
    if(!values.intake)context.addIssue({code:z.ZodIssueCode.custom,path:['intake'],message:'Select an intended intake.'})
  }
})
type FormValues=z.infer<ReturnType<typeof createSchema>>
const defaultValues:Partial<FormValues>={undergraduateQualification:'',intendedSubject:'',preferredCountries:[],budget:'',intake:'',appointment:'',consent:false,marketingConsent:false,website:''}
const intakes=['Next available intake','Within 6–12 months','More than 12 months','Not sure yet']

function RequestForm({kind}:{kind:'consultation'|'contact'}) {
  const [submitted,setSubmitted]=useState(false)
  const [failure,setFailure]=useState('')
  const {register,handleSubmit,formState:{errors,isSubmitting}}=useForm<FormValues>({resolver:zodResolver(createSchema(kind)),defaultValues})
  const submit=async(values:FormValues)=>{
    setFailure('')
    try { await submitRequest(kind,{...values, appointment: values.appointment ? new Date(values.appointment).toISOString() : ''});setSubmitted(true) }
    catch(error) { setFailure(error instanceof Error?error.message:'We could not save your request. Please try again.') }
  }
  if(submitted)return <div role="status" className="rounded-2xl border border-teal/20 bg-[#f1faf6] p-8"><CheckCircle2 className="text-teal" size={36}/><h2 className="mt-4 font-display text-2xl font-bold text-navy">Your request has been saved.</h2><p className="mt-3 leading-7 text-slate-600">Thank you for reaching out. This is a consultation request, not a confirmed appointment. Our team will review it and contact you using the details provided. If you selected a preferred time, it will be checked separately.</p><Link className="mt-5 inline-flex font-bold text-teal" to="/">Back to WayFindr <ArrowRight size={16}/></Link></div>
  return <form onSubmit={handleSubmit(submit)} noValidate className="card p-5 sm:p-8">
    {failure&&<div role="alert" className="mb-6 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-900"><AlertCircle className="mt-0.5 shrink-0" size={18}/>{failure}</div>}
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Full name" name="fullName" error={errors.fullName?.message}><input autoComplete="name" className="form-control" placeholder="Your name" id="fullName" {...register('fullName')}/></Field>
      <Field label="Email address" name="email" error={errors.email?.message}><input type="email" autoComplete="email" className="form-control" placeholder="you@example.com" id="email" {...register('email')}/></Field>
      <Field label="Phone number with country code" name="phone" error={errors.phone?.message}><input type="tel" autoComplete="tel" className="form-control" placeholder="+1 555 000 0000" id="phone" {...register('phone')}/></Field>
      {kind==='consultation'&&<><Field label="Undergraduate qualification" name="undergraduateQualification" error={errors.undergraduateQualification?.message}><><input list="qualification-options" className="form-control" placeholder="Degree, subject, institution, or Not sure yet" id="undergraduateQualification" {...register('undergraduateQualification')}/><datalist id="qualification-options"><option value="Not sure yet"/></datalist></></Field>
      <Field label="Intended master’s subject" name="intendedSubject" error={errors.intendedSubject?.message}><><input list="subject-options" className="form-control" placeholder="e.g. Data science, public health, or Not sure yet" id="intendedSubject" {...register('intendedSubject')}/><datalist id="subject-options"><option value="Not sure yet"/></datalist></></Field>
      <fieldset className="sm:col-span-2"><legend className="label">Preferred countries <span className="font-normal text-slate-500">(choose all that apply)</span></legend><div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">{[...destinations.map((d)=>d.name),'Not sure yet'].map((country)=><label key={country} className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" value={country} className="rounded border-slate-300 text-teal focus:ring-teal" {...register('preferredCountries')}/>{country}</label>)}</div>{errors.preferredCountries&&<p className="error-text" role="alert">{errors.preferredCountries.message}</p>}</fieldset>
      <Field label="Budget range and currency" name="budget" error={errors.budget?.message}><><input list="budget-options" className="form-control" placeholder="For example, annual tuition budget in your currency—or Not sure yet" id="budget" {...register('budget')}/><datalist id="budget-options"><option value="Not sure yet"/></datalist></></Field>
      <Field label="Intended intake" name="intake" error={errors.intake?.message}><select className="form-control" id="intake" {...register('intake')}><option value="">When are you hoping to start?</option>{intakes.map((x)=><option key={x}>{x}</option>)}</select></Field></>}
      {kind==='consultation'&&<Field label="Preferred date & time (optional)" name="appointment" error={errors.appointment?.message}><input type="datetime-local" className="form-control" id="appointment" {...register('appointment')}/><span className="mt-1 block text-xs text-slate-500">Your device timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}. This is a request only; we will confirm availability separately.</span></Field>}
      <div className="sm:col-span-2"><label htmlFor="message" className="label">{kind==='contact'?'How can we help?':'Anything else you would like us to know?'} <span className="font-normal text-slate-500">(optional)</span></label><textarea rows={4} maxLength={2000} className="form-control" placeholder="Share any questions or context that would help us prepare." id="message" {...register('message')}/>{errors.message&&<p className="error-text" role="alert">{errors.message.message}</p>}</div>
    </div>
    <div className="mt-6 space-y-3 border-t border-slate-100 pt-5"><label className="flex items-start gap-3 text-sm leading-6 text-slate-600"><input type="checkbox" className="mt-1 rounded border-slate-300 text-teal focus:ring-teal" {...register('consent')}/><span>I agree that WayFindr may contact me about this inquiry. See the <Link className="font-semibold text-teal underline" to="/privacy">privacy notice</Link>. <strong className="text-red-700">Required</strong></span></label>{errors.consent&&<p role="alert" className="error-text">{errors.consent.message}</p>}<label className="flex items-start gap-3 text-sm leading-6 text-slate-600"><input type="checkbox" className="mt-1 rounded border-slate-300 text-teal focus:ring-teal" {...register('marketingConsent')}/><span>I would also like to receive occasional WayFindr updates. This is optional and can be changed later.</span></label></div>
    <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden"><label>Leave this field empty<input tabIndex={-1} autoComplete="off" {...register('website')}/></label></div>
    {!supabaseConfigured&&<p className="mt-5 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">Submissions are currently unavailable because the backend is not configured. This form will not show success or discard your request.</p>}
    <button disabled={isSubmitting||!supabaseConfigured} className="button-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto">{isSubmitting?'Saving your request…':kind==='contact'?'Send your inquiry':'Request a free consultation'} <ArrowRight size={16}/></button><p className="mt-3 text-xs text-slate-500">Your request is not an appointment confirmation. We will follow up to discuss availability.</p>
  </form>
}

function Field({label,name,error,children}:{label:string;name:string;error?:string;children:React.ReactNode}) { return <div><label className="label" htmlFor={name}>{label}</label><div>{children}</div>{error&&<p className="error-text" role="alert">{error}</p>}</div> }

export function ConsultationPage() { return <section className="section bg-[#f7faf8]"><div className="wrap grid items-start gap-10 lg:grid-cols-[.72fr_1.28fr]"><div><PageIntro eyebrow="Master’s study consultation" title="Plan your postgraduate next step." text="Share your undergraduate background, intended master’s subject, preferred countries, budget, and target intake. Choose “Not sure yet” wherever you are still exploring."/><div className="rounded-2xl bg-white p-5"><Clock3 className="text-teal"/><h2 className="mt-3 font-display font-bold text-navy">What happens next?</h2><p className="mt-2 text-sm leading-6 text-slate-600">Your preferred date and time are a request only. Our team will check availability and contact you to confirm a suitable time. Submitting this form does not book an appointment.</p></div></div><RequestForm kind="consultation"/></div></section> }

export function ContactPage() { const socials=Object.entries(business.social).filter(([,url])=>isConfigured(url)&&/^https:\/\//.test(url));const mapUrl=isConfigured(business.officeAddress)?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.officeAddress)}`:'';return <section className="section"><div className="wrap grid items-start gap-10 lg:grid-cols-[.7fr_1.3fr]"><div><PageIntro eyebrow="Get in touch" title="We are here to help you find your way." text="Have a question about destinations, courses, or how to get started? Send us a note."/><div className="space-y-4 rounded-2xl bg-[#f7faf8] p-6"><h2 className="font-display font-bold text-navy">Contact details</h2>{isConfigured(business.email)?<p><span className="text-sm text-slate-500">Email</span><br/><a className="font-semibold text-teal" href={`mailto:${business.email}`}>{business.email}</a></p>:<p className="text-sm leading-6 text-slate-600">Email contact details will appear here when configured.</p>}{isConfigured(business.phone)&&<p><span className="text-sm text-slate-500">Phone</span><br/><a className="font-semibold text-teal" href={`tel:${business.phone}`}>{business.phone}</a></p>}{isConfigured(business.businessHours)&&<p><span className="text-sm text-slate-500">Business hours</span><br/><span className="text-slate-700">{business.businessHours}</span></p>}{isConfigured(business.officeAddress)&&<p><span className="text-sm text-slate-500">Office</span><br/><span className="text-slate-700">{business.officeAddress}</span><a className="mt-2 block text-sm font-semibold text-teal" href={mapUrl} target="_blank" rel="noreferrer">View map ↗</a></p>}{isConfigured(business.whatsapp)&&<a rel="noreferrer" target="_blank" className="button-primary w-full" href={`https://wa.me/${business.whatsapp.replace(/\D/g,'')}`}>Chat on WhatsApp</a>}{socials.length>0&&<div><p className="text-sm text-slate-500">Follow WayFindr</p><div className="mt-2 flex flex-wrap gap-3">{socials.map(([network,url])=><a key={network} href={url} target="_blank" rel="noreferrer" className="font-semibold capitalize text-teal">{network} ↗</a>)}</div></div>}<p className="text-xs leading-5 text-slate-500">Unconfigured contact methods are hidden to avoid displaying invented details.</p></div></div><RequestForm kind="contact"/></div></section> }