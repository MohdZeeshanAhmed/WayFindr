# WayFindr workspace notes

- Stack: React 18, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, React Hook Form, Zod, Supabase.
- Run `npm run dev`, `npm run typecheck`, and `npm run build` from the repository root.
- Keep business contact/profile details in `src/config/business.ts`; do not invent facts or show unconfigured contact methods.
- Sample catalog entries must remain clearly labeled as demonstrations. Do not imply real university affiliations, verified fees, outcomes, or testimonials.
- Public content is published-only. Private inquiries must remain inaccessible to public roles; enforce permissions with Supabase RLS and server-side validation.
- Never expose a Supabase service-role key, email provider key, or other privileged secret in frontend code or `VITE_` environment variables.
- Review README launch checklist before production deployment. Privacy and terms are legal-review drafts.