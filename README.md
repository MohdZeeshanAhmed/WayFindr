# WayFindr

**Find Your Way to a Master’s Abroad.** A responsive React + TypeScript website for exploring postgraduate study destinations, comparing clearly labeled sample programs, and requesting personalized guidance.

## Project status

- **Working locally:** responsive navigation, postgraduate destination guides, master's program explorer with URL filters/sort/pagination, shortlist and three-item comparison in localStorage, resource and FAQ search, consultation validation, and an authenticated admin interface.
- **Demonstration content:** all local program and institution listings are explicitly fictional examples. Tuition is not supplied and durations are illustrative; no partnership, accreditation, testimonial, outcome, deadline, scholarship, or immigration result claims are invented.
- **Destination sources:** destination pages link official study and immigration sources. Source links are dated as checked in the UI; applicants must verify current rules and exact program requirements with the university and relevant authorities.
- **Requires configuration:** saving consultation/contact requests, Supabase-backed published resource loading, admin authentication and persistence, email notifications, and real business/contact details. Forms are disabled until Supabase is configured and report backend failures without claiming success.
- **Not legal advice:** privacy and terms are editable drafts requiring jurisdiction-specific review before launch.

## Requirements

- Node.js 20.19+ or 22.12+ recommended (Vite 6).
- npm 10+.
- A Supabase project for backend features. The public website can be explored without it; request forms remain unavailable until configured.

## Local setup

1. Install packages: `npm install`
2. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_SITE_URL`. The URL and publishable/anon key are public browser configuration; **never** put service-role, email provider, or other privileged secrets in a `VITE_` variable.
3. Start the frontend: `npm run dev`
4. Verify a production bundle: `npm run build`
5. Preview the production bundle locally: `npm run preview`

Without Supabase configuration, the public catalog and local demonstration pages still work. Requests cannot be submitted, and admin sign-in stays disabled.

## Supabase setup

1. Install the Supabase CLI and authenticate locally.
2. Link this repository to your Supabase project using the CLI, then apply `supabase/migrations/202610310001_initial_schema.sql` with `supabase db push` (or apply the migration through the Supabase SQL editor).
3. Set the project URL and publishable/anon key in the frontend `.env` file.
4. Set Edge Function secrets on the Supabase project, never in the frontend: `SUPABASE_SERVICE_ROLE_KEY`, `ALLOWED_ORIGIN` (the exact production website origin), and a random `RATE_LIMIT_SALT`. The service-role key bypasses RLS and must remain server-side.
5. Deploy the request handler with `supabase functions deploy public-submission`. It validates allowed fields, checks consent, validates postgraduate qualifications, intended subject, preferred countries, budget, and intake, applies a database-backed limit of five requests per hashed network address per hour, and stores private requests using the server-side service role.
6. Confirm the application origin and CORS policy using your deployed domain before enabling the form. Do not use wildcard origins in production.

### Administrator provisioning

1. Create an administrator account in Supabase Auth using the dashboard or an invitation flow you control. Do not offer public signup for the admin area.
2. After verifying the Auth user, insert its UUID into `public.admin_users` using the Supabase SQL editor or a trusted administrative connection. Example: `insert into public.admin_users (user_id) values ('AUTH_USER_UUID');`
3. Configure Auth password reset and MFA policies appropriate to your organization. Never grant the browser permission to insert into `admin_users`.
4. Sign in at `/admin/login`. RLS policies enforce allowlisted admin access to private inquiries, availability, and content. Hiding an admin route is not the security boundary.

### Content management

The dashboard creates draft content records for destinations, universities, courses, services, resources, FAQs, and approved testimonials. Records remain drafts until an administrator publishes them. Public content reads use the published-content RLS policy. Destination, course, service, resource, FAQ, testimonial, and institution pages read published records; local demonstration catalogs remain fallbacks. Destination and resource records are validated before publishing and before rendering their detail pages. Supply all fields required by `src/lib/publishedContent.ts` for destination records. Only add real testimonials with the student’s explicit approval.

### Email notifications

Optional notification is sent from the Edge Function after a request has been stored. Set `RESEND_API_KEY`, `NOTIFICATION_EMAIL`, and (for a verified sending domain) `EMAIL_FROM` as Supabase function secrets. Without these values, storage still succeeds and the UI accurately says the request was saved; email is not represented as delivered. A provider failure never removes the saved request. Configure provider deliverability and a privacy-appropriate notification workflow before launch.

## Data and security notes

- Public users can select only published `content_items` rows.
- No public policy grants select access to `private_requests`; writes are performed through the validated Edge Function only.
- Authenticated administrators must exist in the backend `admin_users` allowlist. RLS protects content, inquiries, and appointment availability.
- The Edge Function discards unknown submitted properties and stores only validated request fields. Network addresses are hashed with a server-side salt for rate limiting; review retention and privacy obligations with counsel.
- The honeypot is a basic spam control, not a substitute for monitoring, provider-level protections, or abuse response.
- Public database submission is not enabled directly from the browser.

## Deployment and direct-route refreshes

Deploy `dist/` to a static host. Configure SPA rewrites so nested paths (for example `/destinations/canada`, `/courses/demo-01`, and `/admin`) serve `index.html`; otherwise direct refreshes return a host 404. Vercel can use the included `vercel.json`; Netlify can use the included `_redirects` file. Configure the production `VITE_SITE_URL`, Supabase function origin, and environment variables for the target environment.

The app sets route-specific document titles, descriptions, and canonical URLs client-side. A static SPA may not provide complete per-route metadata to crawlers that do not execute JavaScript. For stronger indexing and server-rendered social cards, add an SSR/prerender stage or hosting integration; create and host a real social preview image before launch.

## Before launch

- Add approved real counselor profiles and reviewed organization/about copy.
- Add actual business email, phone, office hours, social links, address/map, and WhatsApp number only after verification.
- Replace demo institutions/programs with permissioned, accurate postgraduate listings. Add university-specific requirements and verified tuition, duration, intake, funding details, direct source URLs, and editorial review dates; do not rely on the fictional examples.
- Confirm official source links remain current and add verified program-specific information before presenting any listing as real.
- Review destination guidance and immigration disclaimers against current official sources. The site does not provide legal or immigration advice.
- Add services/pricing and appointment availability rules if applicable.
- Review privacy notice, terms, consent wording, data retention, deletion process, and jurisdictional obligations with qualified counsel.
- Verify Supabase RLS, administrator MFA and provisioning, function origin, rate limiting, backups, logs, alerting, and production email delivery.
- Test request storage and email failure behavior in the production-like Supabase environment. Confirm requests appear only for authorized admins.
- Add accessibility, browser/device, visual, and security testing to the release pipeline.

## Useful commands

- `npm run dev` — local development server
- `npm test` — frontend rendering and request-handler regression checks (mocked backend; no browser or live database)
- `npm run typecheck` — TypeScript checks
- `npm run build` — type-check and create production build
- `npm run preview` — serve production build locally

Appointment requests are submitted as UTC timestamps, preserving the time selected in the device timezone. Deploy frontend and `public-submission` function changes together; the handler rejects timestamps without a timezone. Availability entry uses the administrator’s device timezone.
