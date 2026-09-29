-- ============================================================
-- NEXORA — core schema (brick 1: Supabase persistence)
-- Tables: profiles, contacts, meetings, meeting_transcripts,
--         memories, commitments, reminders
-- Conventions: UUID PKs, timestamptz timestamps, RLS enabled on
-- every table. user_id is nullable now so Supabase Auth can be
-- attached later without a migration of existing columns.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- A. profiles / users ----------
create table if not exists public.profiles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- ---------- B. contacts ----------
create table if not exists public.contacts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete set null,
  name        text not null,
  role        text,
  company     text,
  email       text,
  hue         integer not null default 250,      -- avatar gradient hue used by the existing UI
  avatar_url  text,
  created_at  timestamptz not null default now()
);
alter table public.contacts enable row level security;

-- ---------- C. meetings ----------
create table if not exists public.meetings (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.profiles(id) on delete set null,
  contact_id      uuid not null references public.contacts(id) on delete cascade,
  title           text not null,
  purpose         text,
  meeting_date    date not null,
  meeting_time    time,
  zoom_meeting_id text,        -- reserved for the Zoom brick (not populated yet)
  zoom_join_url   text,        -- reserved for the Zoom brick (not populated yet)
  status          text not null default 'upcoming'
                  check (status in ('upcoming', 'completed', 'cancelled')),
  summary         text,        -- short recap shown in existing cards
  created_at      timestamptz not null default now()
);
alter table public.meetings enable row level security;

-- ---------- D. meeting_transcripts ----------
create table if not exists public.meeting_transcripts (
  id            uuid primary key default gen_random_uuid(),
  meeting_id    uuid not null references public.meetings(id) on delete cascade,
  speaker_name  text,
  speaker_id    text,
  transcript_text text not null,
  timestamp     timestamptz,
  created_at    timestamptz not null default now()
);
alter table public.meeting_transcripts enable row level security;

-- ---------- E. memories ----------
create table if not exists public.memories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete set null,
  meeting_id  uuid not null references public.meetings(id) on delete cascade,
  contact_id  uuid not null references public.contacts(id) on delete cascade,
  type        text not null check (type in
              ('discussion', 'concern', 'decision', 'commitment', 'followup', 'preference')),
  content     text not null,
  confidence  numeric(3, 2) not null default 0.90 check (confidence >= 0 and confidence <= 1),
  topics      text[] not null default '{}',
  is_open     boolean not null default false,   -- open/closed indicator in existing UI
  created_at  timestamptz not null default now()
);
alter table public.memories enable row level security;

-- ---------- F. commitments ----------
create table if not exists public.commitments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete set null,
  meeting_id  uuid not null references public.meetings(id) on delete cascade,
  contact_id  uuid not null references public.contacts(id) on delete cascade,
  description text not null,
  due_date    date,
  status      text not null default 'open' check (status in ('open', 'done', 'cancelled')),
  created_at  timestamptz not null default now()
);
alter table public.commitments enable row level security;

-- ---------- G. reminders ----------
create table if not exists public.reminders (
  id              uuid primary key default gen_random_uuid(),
  meeting_id      uuid not null references public.meetings(id) on delete cascade,
  recipient_email text not null,
  reminder_time   timestamptz not null,
  status          text not null default 'pending'
                  check (status in ('pending', 'sent', 'failed', 'cancelled')),
  sent_at         timestamptz,
  created_at      timestamptz not null default now()
);
alter table public.reminders enable row level security;

-- ============================================================
-- Indexes
-- ============================================================
create index if not exists idx_contacts_user          on public.contacts (user_id);
create index if not exists idx_meetings_contact       on public.meetings (contact_id);
create index if not exists idx_meetings_user          on public.meetings (user_id);
create index if not exists idx_meetings_date          on public.meetings (meeting_date);
create index if not exists idx_meetings_status        on public.meetings (status);
create index if not exists idx_transcripts_meeting    on public.meeting_transcripts (meeting_id);
create index if not exists idx_memories_meeting       on public.memories (meeting_id);
create index if not exists idx_memories_contact       on public.memories (contact_id);
create index if not exists idx_memories_type          on public.memories (type);
create index if not exists idx_memories_open          on public.memories (is_open) where is_open;
create index if not exists idx_commitments_meeting    on public.commitments (meeting_id);
create index if not exists idx_commitments_contact    on public.commitments (contact_id);
create index if not exists idx_commitments_status     on public.commitments (status);
create index if not exists idx_reminders_meeting      on public.reminders (meeting_id);
create index if not exists idx_reminders_status       on public.reminders (status);

-- ============================================================
-- Row Level Security policies
-- ------------------------------------------------------------
-- No auth exists yet, so:
--  * SELECT is open to anon — the current demo app reads with the
--    publishable key. Fictional demo data only.
--  * INSERT is allowed for anon with user_id null — needed so the
--    "create meeting" flow works before Supabase Auth lands.
--  * UPDATE/DELETE are restricted to authenticated users.
-- When auth is added: tighten SELECT/INSERT to user_id = auth.uid().
-- RLS is never disabled to make things work.
-- ============================================================

-- profiles
create policy "profiles_select_public_demo" on public.profiles
  for select using (true);
create policy "profiles_insert_authenticated" on public.profiles
  for insert to authenticated with check (id = auth.uid());

-- Generic pattern for data tables (contacts, meetings, memories,
-- commitments, reminders, meeting_transcripts) ------------------

create policy "contacts_select_public_demo" on public.contacts
  for select using (true);
create policy "contacts_insert_anon_demo" on public.contacts
  for insert to anon with check (user_id is null);
create policy "contacts_all_authenticated" on public.contacts
  for all to authenticated
  using (user_id is null or user_id = auth.uid())
  with check (user_id is null or user_id = auth.uid());

create policy "meetings_select_public_demo" on public.meetings
  for select using (true);
create policy "meetings_insert_anon_demo" on public.meetings
  for insert to anon with check (user_id is null);
create policy "meetings_all_authenticated" on public.meetings
  for all to authenticated
  using (user_id is null or user_id = auth.uid())
  with check (user_id is null or user_id = auth.uid());

create policy "transcripts_select_public_demo" on public.meeting_transcripts
  for select using (true);
create policy "transcripts_insert_anon_demo" on public.meeting_transcripts
  for insert to anon with check (true);
create policy "transcripts_all_authenticated" on public.meeting_transcripts
  for all to authenticated
  using (true)
  with check (true);

create policy "memories_select_public_demo" on public.memories
  for select using (true);
create policy "memories_insert_anon_demo" on public.memories
  for insert to anon with check (user_id is null);
create policy "memories_all_authenticated" on public.memories
  for all to authenticated
  using (user_id is null or user_id = auth.uid())
  with check (user_id is null or user_id = auth.uid());

create policy "commitments_select_public_demo" on public.commitments
  for select using (true);
create policy "commitments_insert_anon_demo" on public.commitments
  for insert to anon with check (user_id is null);
create policy "commitments_all_authenticated" on public.commitments
  for all to authenticated
  using (user_id is null or user_id = auth.uid())
  with check (user_id is null or user_id = auth.uid());

create policy "reminders_select_public_demo" on public.reminders
  for select using (true);
create policy "reminders_insert_anon_demo" on public.reminders
  for insert to anon with check (true);
create policy "reminders_all_authenticated" on public.reminders
  for all to authenticated
  using (true)
  with check (true);
