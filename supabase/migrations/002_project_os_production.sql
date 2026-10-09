-- Production hardening for YardVest Project OS.
-- Apply after 001_project_os.sql.

create table public.advisor_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects on delete cascade,
  contact_id uuid not null references public.contacts,
  property_id uuid references public.properties,
  message text,
  preferred_method text,
  preferred_time text,
  status public.record_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.partner_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text not null,
  email text not null,
  phone text,
  website text,
  service_area text not null,
  partner_type text not null,
  message text,
  status public.record_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  advisor_id uuid not null references public.profiles on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  timezone text not null,
  slot_minutes integer not null default 30 check (slot_minutes between 15 and 180),
  active boolean not null default true
);

create table public.availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  advisor_id uuid not null references public.profiles on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  available boolean not null default false,
  note text
);

create table public.reservation_settings (
  id uuid primary key default gen_random_uuid(),
  product_family_id uuid unique references public.product_families on delete cascade,
  amount numeric check (amount >= 0),
  currency text not null default 'CAD',
  refundable boolean,
  credit_to_project boolean not null default true,
  expiry_days integer not null default 7,
  terms text,
  active boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.email_templates (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  subject text not null,
  html text not null,
  text_body text,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.sequences (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  trigger_event text not null,
  active boolean not null default false
);

create table public.sequence_steps (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references public.sequences on delete cascade,
  step_order integer not null,
  delay_minutes integer not null default 0,
  action_type text not null check (action_type in ('email','task','notification')),
  template_id uuid references public.email_templates,
  configuration jsonb not null default '{}',
  unique(sequence_id, step_order)
);

create table public.sequence_enrollments (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references public.sequences,
  project_id uuid not null references public.projects on delete cascade,
  next_step integer not null default 1,
  next_run_at timestamptz,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now()
);

create table public.webhook_events (
  id text primary key,
  provider text not null,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.content_entries (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value jsonb not null,
  published boolean not null default false,
  updated_by uuid references public.profiles,
  updated_at timestamptz not null default now()
);

alter table public.advisor_requests enable row level security;
alter table public.partner_inquiries enable row level security;
alter table public.availability_rules enable row level security;
alter table public.availability_exceptions enable row level security;
alter table public.reservation_settings enable row level security;
alter table public.email_templates enable row level security;
alter table public.sequences enable row level security;
alter table public.sequence_steps enable row level security;
alter table public.sequence_enrollments enable row level security;
alter table public.webhook_events enable row level security;
alter table public.content_entries enable row level security;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from profiles where id = auth.uid() and role in ('admin','advisor')) $$;

create policy "staff manage contacts" on public.contacts for all using (public.is_staff()) with check (public.is_staff());
create policy "staff manage properties" on public.properties for all using (public.is_staff()) with check (public.is_staff());
create policy "staff manage leads" on public.leads for all using (public.is_staff()) with check (public.is_staff());
create policy "staff manage projects" on public.projects for all using (public.is_staff()) with check (public.is_staff());
create policy "staff manage reviews" on public.property_reviews for all using (public.is_staff()) with check (public.is_staff());
create policy "staff manage consultations" on public.consultations for all using (public.is_staff()) with check (public.is_staff());
create policy "staff manage activities" on public.activities for all using (public.is_staff()) with check (public.is_staff());
create policy "staff manage tasks" on public.tasks for all using (public.is_staff()) with check (public.is_staff());
create policy "staff manage reservations" on public.reservations for all using (public.is_staff()) with check (public.is_staff());
create policy "staff manage proposals" on public.proposals for all using (public.is_staff()) with check (public.is_staff());
create policy "staff manage documents" on public.documents for all using (public.is_staff()) with check (public.is_staff());
create policy "staff manage contracts" on public.contracts for all using (public.is_staff()) with check (public.is_staff());
create policy "staff manage payments" on public.payments for all using (public.is_staff()) with check (public.is_staff());
create policy "staff manage advisor requests" on public.advisor_requests for all using (public.is_staff()) with check (public.is_staff());
create policy "staff manage partner inquiries" on public.partner_inquiries for all using (public.is_staff()) with check (public.is_staff());
create policy "staff manage availability" on public.availability_rules for all using (public.is_staff()) with check (public.is_staff());
create policy "staff manage availability exceptions" on public.availability_exceptions for all using (public.is_staff()) with check (public.is_staff());
create policy "staff manage reservation settings" on public.reservation_settings for all using (public.is_staff()) with check (public.is_staff());
create policy "staff manage email templates" on public.email_templates for all using (public.is_staff()) with check (public.is_staff());
create policy "staff manage sequences" on public.sequences for all using (public.is_staff()) with check (public.is_staff());
create policy "staff manage sequence steps" on public.sequence_steps for all using (public.is_staff()) with check (public.is_staff());
create policy "staff manage enrollments" on public.sequence_enrollments for all using (public.is_staff()) with check (public.is_staff());
create policy "published content is public" on public.content_entries for select using (published = true);
create policy "staff manage content" on public.content_entries for all using (public.is_staff()) with check (public.is_staff());

create policy "customers read own properties" on public.properties for select using (contact_id in (select id from public.contacts where user_id = auth.uid()));
create policy "customers read own reviews" on public.property_reviews for select using (project_id in (select id from public.projects where contact_id in (select id from public.contacts where user_id = auth.uid())));
create policy "customers read own consultations" on public.consultations for select using (project_id in (select id from public.projects where contact_id in (select id from public.contacts where user_id = auth.uid())));
create policy "customers read own reservations" on public.reservations for select using (project_id in (select id from public.projects where contact_id in (select id from public.contacts where user_id = auth.uid())));
create policy "customers read own proposals" on public.proposals for select using (project_id in (select id from public.projects where contact_id in (select id from public.contacts where user_id = auth.uid())));
create policy "customers read own documents" on public.documents for select using (project_id in (select id from public.projects where contact_id in (select id from public.contacts where user_id = auth.uid())));
create policy "customers read own contracts" on public.contracts for select using (project_id in (select id from public.projects where contact_id in (select id from public.contacts where user_id = auth.uid())));
create policy "customers read own payments" on public.payments for select using (project_id in (select id from public.projects where contact_id in (select id from public.contacts where user_id = auth.uid())));

create unique index consultations_no_double_booking on public.consultations(advisor_id, starts_at) where status not in ('cancelled','expired');
create index projects_stage_idx on public.projects(stage);
create index tasks_due_idx on public.tasks(status, due_at);
create index activities_project_created_idx on public.activities(project_id, created_at desc);
create index payments_project_status_idx on public.payments(project_id, status);

insert into public.email_templates(slug, subject, html, text_body) values
('property-received','We received your YardVest property','<h1>Your property review has started</h1><p>Thanks for sharing your property. A YardVest Advisor will review what may fit and the next best step.</p>','Your YardVest property review has started.'),
('consultation-confirmed','Your YardVest consultation is confirmed','<h1>Consultation confirmed</h1><p>Your YardVest consultation is booked. Details are included below.</p>','Your YardVest consultation is confirmed.'),
('payment-received','Your YardVest payment is confirmed','<h1>Payment received</h1><p>Thank you. Your payment has been recorded against your YardVest project.</p>','Your YardVest payment has been received.')
on conflict (slug) do nothing;
