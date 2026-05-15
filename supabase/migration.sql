-- ============================================================
-- Decision Lab — Supabase migration
-- Run this in the Supabase dashboard: SQL Editor → New query
-- ============================================================

-- Decisions table
-- We store the full decision object as JSONB for flexibility.
-- The `id` column matches the UUID generated client-side.
create table if not exists public.decisions (
  id          uuid primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  data        jsonb not null,
  created_at  timestamptz default now() not null
);

-- Index for fast per-user queries
create index if not exists decisions_user_id_idx
  on public.decisions(user_id);

-- Index so we can sort by the nested created_at inside data (optional but nice)
create index if not exists decisions_created_at_idx
  on public.decisions(created_at desc);

-- ── Row Level Security ─────────────────────────────────────
alter table public.decisions enable row level security;

-- Each user can only see and modify their own decisions
create policy "Users manage own decisions"
  on public.decisions
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
