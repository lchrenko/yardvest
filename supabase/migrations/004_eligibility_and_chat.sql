alter table public.properties add column if not exists latitude numeric;
alter table public.properties add column if not exists longitude numeric;

create table public.property_assessments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects on delete cascade,
  jurisdiction text,
  result text not null check (result in ('promising','expert_review','outside_hrm_scope')),
  inputs jsonb not null default '{}',
  findings jsonb not null default '[]',
  source_version text not null default 'hrm-2026-10',
  created_at timestamptz not null default now()
);

create table public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  visitor_token_hash text not null,
  contact_id uuid references public.contacts,
  project_id uuid references public.projects on delete set null,
  status public.record_status not null default 'active',
  assigned_to uuid references public.profiles,
  source_page text,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations on delete cascade,
  sender_type text not null check (sender_type in ('visitor','customer','expert','system')),
  sender_id uuid references public.profiles,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

alter table public.property_assessments enable row level security;
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;

create policy "staff manage assessments" on public.property_assessments for all using (public.is_staff()) with check (public.is_staff());
create policy "customers read own assessments" on public.property_assessments for select using (project_id in (select id from public.projects where contact_id in (select id from public.contacts where user_id = auth.uid())));
create policy "staff manage chat conversations" on public.chat_conversations for all using (public.is_staff()) with check (public.is_staff());
create policy "staff manage chat messages" on public.chat_messages for all using (public.is_staff()) with check (public.is_staff());
create policy "customers read own chat conversations" on public.chat_conversations for select using (contact_id in (select id from public.contacts where user_id = auth.uid()));
create policy "customers read own chat messages" on public.chat_messages for select using (conversation_id in (select id from public.chat_conversations where contact_id in (select id from public.contacts where user_id = auth.uid())));

create index chat_conversations_queue_idx on public.chat_conversations(status,last_message_at desc);
create index chat_messages_conversation_idx on public.chat_messages(conversation_id,created_at);
