create extension if not exists pgcrypto with schema extensions;

create type public.publication_status as enum ('draft', 'published');
create type public.request_status as enum ('New', 'Contacted', 'Closed');

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by text not null default 'manual-provisioning'
);

create or replace function public.is_wayfindr_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_wayfindr_admin() from public, anon;
grant execute on function public.is_wayfindr_admin() to authenticated, service_role;

create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('destination','university','course','service','resource','faq','testimonial')),
  title text not null check (length(title) between 1 and 200),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  status public.publication_status not null default 'draft',
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (content_type, slug)
);
create index content_items_public_idx on public.content_items (content_type, status, title);

create table public.private_requests (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('consultation','contact')),
  status public.request_status not null default 'New',
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  email_sent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index private_requests_created_idx on public.private_requests (created_at desc);

create table public.appointment_availability (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null check (length(timezone) between 1 and 100),
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

-- Kept inaccessible to clients; the Edge Function calls the limiter atomically.
create table public.submission_rate_limits (
  ip_hash text primary key,
  window_started_at timestamptz not null,
  submission_count integer not null check (submission_count >= 0)
);

create or replace function public.consume_public_submission_limit(p_ip_hash text, p_now timestamptz default now())
returns boolean
language plpgsql security definer
set search_path = ''
as $$
declare current_count integer;
begin
  insert into public.submission_rate_limits as limits (ip_hash, window_started_at, submission_count)
  values (p_ip_hash, p_now, 1)
  on conflict (ip_hash) do update
    set window_started_at = case when limits.window_started_at <= p_now - interval '1 hour' then p_now else limits.window_started_at end,
        submission_count = case when limits.window_started_at <= p_now - interval '1 hour' then 1 else limits.submission_count + 1 end
  returning submission_count into current_count;
  return current_count <= 5;
end;
$$;
revoke all on function public.consume_public_submission_limit(text, timestamptz) from public, anon, authenticated;
grant execute on function public.consume_public_submission_limit(text, timestamptz) to service_role;

alter table public.admin_users enable row level security;
alter table public.content_items enable row level security;
alter table public.private_requests enable row level security;
alter table public.appointment_availability enable row level security;
alter table public.submission_rate_limits enable row level security;

create policy "Admins can see their own allowlist record"
  on public.admin_users for select to authenticated using (user_id = (select auth.uid()));
create policy "Published content is visible to visitors"
  on public.content_items for select to anon, authenticated using (status = 'published');
create policy "Admins manage content"
  on public.content_items for all to authenticated using ((select public.is_wayfindr_admin())) with check ((select public.is_wayfindr_admin()));
create policy "Only admins read private inquiries"
  on public.private_requests for select to authenticated using ((select public.is_wayfindr_admin()));
create policy "Only admins update private inquiries"
  on public.private_requests for update to authenticated using ((select public.is_wayfindr_admin())) with check ((select public.is_wayfindr_admin()));
create policy "Only admins manage availability"
  on public.appointment_availability for all to authenticated using ((select public.is_wayfindr_admin())) with check ((select public.is_wayfindr_admin()));

grant select on public.content_items to anon, authenticated;
grant insert, update, delete on public.content_items to authenticated;
grant select on public.admin_users to authenticated;
grant select, update on public.private_requests to authenticated;
grant select, insert, update, delete on public.appointment_availability to authenticated;
revoke all on public.private_requests from anon, authenticated;
grant select, update on public.private_requests to authenticated;
revoke all on public.submission_rate_limits from anon, authenticated;

-- Public demo resources only; replace/review before production publishing.
insert into public.content_items (content_type, title, slug, status, content) values
('resource','Your study application checklist','application-checklist','published',jsonb_build_object('category','Applications','excerpt','A practical starting point for organizing research, documents, and important dates.','body','Begin with your goals and shortlist. For every course, record entry requirements, application route, documents, and the institution’s current deadlines. Recheck requirements on official institution pages.','sample',true)),
('resource','How to research scholarships thoughtfully','scholarship-research','published',jsonb_build_object('category','Funding','excerpt','Where to look, what eligibility means, and how to keep track of deadlines.','body','Start with institution and government scholarship pages, then check reputable external providers. Confirm eligibility and deadlines directly with each provider.','sample',true)),
('resource','Getting ready for your next chapter','prepare-to-go','published',jsonb_build_object('category','Preparation','excerpt','A calm, step-by-step guide to the practical details of moving for study.','body','Build a checklist for accommodation, travel, health, documents, and campus onboarding. Requirements depend on the destination; use current official guidance.','sample',true));

comment on table public.private_requests is 'Private consultation and contact requests. Inserts are only allowed via the validated public-submission Edge Function using the service role.';
comment on table public.admin_users is 'Provision administrators manually with SQL; never grant public self-service inserts.';