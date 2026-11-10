import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'

const HomePage = lazy(()=>import('./pages/MarketingPages').then((module)=>({ default: module.HomePage })))
const AboutPage = lazy(()=>import('./pages/MarketingPages').then((module)=>({ default: module.AboutPage })))
const DestinationsPage = lazy(()=>import('./pages/MarketingPages').then((module)=>({ default: module.DestinationsPage })))
const DestinationDetailPage = lazy(()=>import('./pages/MarketingPages').then((module)=>({ default: module.DestinationDetailPage })))
const ServicesPage = lazy(()=>import('./pages/MarketingPages').then((module)=>({ default: module.ServicesPage })))
const ResourcesPage = lazy(()=>import('./pages/MarketingPages').then((module)=>({ default: module.ResourcesPage })))
const ResourceDetailPage = lazy(()=>import('./pages/MarketingPages').then((module)=>({ default: module.ResourceDetailPage })))
const DraftLegalPage = lazy(()=>import('./pages/MarketingPages').then((module)=>({ default: module.DraftLegalPage })))
const NotFoundPage = lazy(()=>import('./pages/MarketingPages').then((module)=>({ default: module.NotFoundPage })))
const ExplorerPage = lazy(()=>import('./pages/ExplorerPages').then((module)=>({ default: module.ExplorerPage })))
const CoursePage = lazy(()=>import('./pages/ExplorerPages').then((module)=>({ default: module.CoursePage })))
const UniversityPage = lazy(()=>import('./pages/ExplorerPages').then((module)=>({ default: module.UniversityPage })))
const ConsultationPage = lazy(()=>import('./pages/FormsPages').then((module)=>({ default: module.ConsultationPage })))
const ContactPage = lazy(()=>import('./pages/FormsPages').then((module)=>({ default: module.ContactPage })))
const AdminLoginPage = lazy(()=>import('./pages/AdminPages').then((module)=>({ default: module.AdminLoginPage })))
const AdminDashboardPage = lazy(()=>import('./pages/AdminPages').then((module)=>({ default: module.AdminDashboardPage })))

function Loading() { return <div role="status" className="grid min-h-[50vh] place-items-center px-5"><p className="text-sm font-semibold text-slate-500">Finding your way…</p></div> }

export default function App() {
 return <Suspense fallback={<Loading/>}><Routes>
  <Route element={<Layout/>}>
    <Route index element={<HomePage/>}/>
    <Route path="about" element={<AboutPage/>}/>
    <Route path="destinations" element={<DestinationsPage/>}/>
    <Route path="destinations/:slug" element={<DestinationDetailPage/>}/>
    <Route path="services" element={<ServicesPage/>}/>
    <Route path="explore" element={<ExplorerPage/>}/>
    <Route path="courses/:id" element={<CoursePage/>}/>
    <Route path="universities/:slug" element={<UniversityPage/>}/>
    <Route path="consultation" element={<ConsultationPage/>}/>
    <Route path="contact" element={<ContactPage/>}/>
    <Route path="resources" element={<ResourcesPage/>}/>
    <Route path="resources/:slug" element={<ResourceDetailPage/>}/>
    <Route path="privacy" element={<DraftLegalPage kind="privacy"/>}/>
    <Route path="terms" element={<DraftLegalPage kind="terms"/>}/>
    <Route path="404" element={<NotFoundPage/>}/>
    <Route path="*" element={<NotFoundPage/>}/>
  </Route>
    <Route path="admin/login" element={<AdminLoginPage/>}/>
    <Route path="admin" element={<AdminDashboardPage/>}/>
 </Routes></Suspense>
}