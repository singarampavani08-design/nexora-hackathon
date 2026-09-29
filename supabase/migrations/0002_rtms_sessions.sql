-- ============================================================
-- NEXORA — Phase 5: RTMS Session Tracking & Transcript Dedup
-- ============================================================

-- 1. Extend meeting_transcripts for deduplication and stream tracking
alter table public.meeting_transcripts
  add column if not exists chunk_id text,
  add column if not exists stream_id text,
  add column if not exists is_final boolean not null default true;

-- Deduplication index on (meeting_id, chunk_id)
create unique index if not exists idx_transcripts_meeting_chunk
  on public.meeting_transcripts (meeting_id, chunk_id)
  where chunk_id is not null;

-- 2. Extend meetings to store zoom_meeting_uuid for exact RTMS matching
alter table public.meetings
  add column if not exists zoom_meeting_uuid text;

create index if not exists idx_meetings_zoom_id
  on public.meetings (zoom_meeting_id);

create index if not exists idx_meetings_zoom_uuid
  on public.meetings (zoom_meeting_uuid);

-- 3. RTMS session tracking table
create table if not exists public.rtms_sessions (
  id                uuid primary key default gen_random_uuid(),
  meeting_id        uuid references public.meetings(id) on delete cascade,
  zoom_meeting_id   text not null,
  zoom_meeting_uuid text,
  rtms_stream_id    text not null,
  status            text not null default 'active' check (status in ('active', 'stopped', 'error')),
  server_urls       text[] not null default '{}',
  connected_at      timestamptz not null default now(),
  disconnected_at   timestamptz,
  metadata          jsonb default '{}'::jsonb
);

alter table public.rtms_sessions enable row level security;

create policy "rtms_sessions_select_public_demo" on public.rtms_sessions
  for select using (true);
create policy "rtms_sessions_insert_anon_demo" on public.rtms_sessions
  for insert to anon with check (true);
create policy "rtms_sessions_update_anon_demo" on public.rtms_sessions
  for update to anon using (true) with check (true);
create policy "rtms_sessions_all_authenticated" on public.rtms_sessions
  for all to authenticated using (true) with check (true);

create index if not exists idx_rtms_sessions_meeting on public.rtms_sessions (meeting_id);
create index if not exists idx_rtms_sessions_zoom_id on public.rtms_sessions (zoom_meeting_id);
create index if not exists idx_rtms_sessions_stream  on public.rtms_sessions (rtms_stream_id);
