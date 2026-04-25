-- SchoolApp Supabase schema.
--
-- Paste this entire file into the Supabase SQL Editor
-- (Project -> SQL Editor -> New query -> Run).
--
-- Creates three tables (profiles, subjects, tasks), indexes, and
-- row-level-security policies so each signed-in user can only see their
-- own rows. Safe to re-run: every statement uses IF NOT EXISTS / CREATE
-- OR REPLACE where possible.

-- ------------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.subjects (
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  room text not null default '',
  teacher text not null default '',
  color text,
  primary key (user_id, name)
);

create table if not exists public.tasks (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  description text,
  subject text,
  due_date date,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists tasks_user_id_idx on public.tasks(user_id);
create index if not exists subjects_user_id_idx on public.subjects(user_id);

-- The application treats subject names as case-insensitive when checking
-- for duplicates ("Math" vs "math" should not both exist for the same
-- user). The (user_id, name) primary key alone is case-sensitive, so we
-- enforce the case-insensitive uniqueness with a functional index.
create unique index if not exists subjects_user_id_name_ci_uniq
  on public.subjects(user_id, lower(name));

-- ------------------------------------------------------------------
-- Row-Level Security
-- ------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.tasks    enable row level security;

-- Drop existing policies (so this file is idempotent).
drop policy if exists "profiles_select_own"   on public.profiles;
drop policy if exists "profiles_insert_own"   on public.profiles;
drop policy if exists "profiles_update_own"   on public.profiles;

drop policy if exists "subjects_select_own"   on public.subjects;
drop policy if exists "subjects_insert_own"   on public.subjects;
drop policy if exists "subjects_update_own"   on public.subjects;
drop policy if exists "subjects_delete_own"   on public.subjects;

drop policy if exists "tasks_select_own"      on public.tasks;
drop policy if exists "tasks_insert_own"      on public.tasks;
drop policy if exists "tasks_update_own"      on public.tasks;
drop policy if exists "tasks_delete_own"      on public.tasks;

-- Profiles: each user can read/write only their own profile row.
create policy "profiles_select_own"
  on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own"
  on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own"
  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Subjects.
create policy "subjects_select_own"
  on public.subjects for select using (auth.uid() = user_id);
create policy "subjects_insert_own"
  on public.subjects for insert with check (auth.uid() = user_id);
create policy "subjects_update_own"
  on public.subjects for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "subjects_delete_own"
  on public.subjects for delete using (auth.uid() = user_id);

-- Tasks.
create policy "tasks_select_own"
  on public.tasks for select using (auth.uid() = user_id);
create policy "tasks_insert_own"
  on public.tasks for insert with check (auth.uid() = user_id);
create policy "tasks_update_own"
  on public.tasks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tasks_delete_own"
  on public.tasks for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------------
-- Auto-create a profile row whenever a new auth user signs up.
-- (Without this, the first name save would insert a fresh row;
-- this just pre-populates an empty one so the UI is never empty.)
-- ------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, '')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
