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

create table if not exists public.friends (
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

create index if not exists tasks_user_id_idx on public.tasks(user_id);
create index if not exists subjects_user_id_idx on public.subjects(user_id);
create index if not exists friends_user_id_idx on public.friends(user_id);
create index if not exists friends_friend_id_idx on public.friends(friend_id);

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
alter table public.friends  enable row level security;

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

drop policy if exists "friends_select_own"    on public.friends;
drop policy if exists "friends_insert_own"    on public.friends;
drop policy if exists "friends_delete_own"    on public.friends;

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

-- Friends are stored as the signed-in user's personal friend list.
create policy "friends_select_own"
  on public.friends for select using (auth.uid() = user_id);
create policy "friends_insert_own"
  on public.friends for insert with check (auth.uid() = user_id);
create policy "friends_delete_own"
  on public.friends for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------------
-- Auto-create a profile row whenever a new auth user signs up.
-- (Without this, the first name save would insert a fresh row;
-- this just pre-populates an empty one so the UI is never empty.)
-- ------------------------------------------------------------------

-- ------------------------------------------------------------------
-- Theme columns on profiles (added after initial schema).
-- ------------------------------------------------------------------

alter table public.profiles
  add column if not exists theme_key text not null default 'light',
  add column if not exists custom_themes jsonb not null default '[]'::jsonb,
  add column if not exists username text,
  add column if not exists avatar_type text not null default 'emoji',
  add column if not exists avatar_value text not null default '🎓';

create unique index if not exists profiles_username_ci_uniq
  on public.profiles(lower(username))
  where username is not null and username <> '';

-- ------------------------------------------------------------------
-- Trigger: auto-create profile row on new sign-up.
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

-- ------------------------------------------------------------------
-- Friend/profile helper functions.
-- These return only public profile fields so the app can search by name
-- or username without opening the whole profiles table through RLS.
-- ------------------------------------------------------------------

create or replace function public.search_profiles(search_term text)
returns table (
  id uuid,
  name text,
  username text,
  avatar_type text,
  avatar_value text,
  is_friend boolean
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.name,
    p.username,
    p.avatar_type,
    p.avatar_value,
    exists (
      select 1
      from public.friends f
      where f.user_id = auth.uid()
        and f.friend_id = p.id
    ) as is_friend
  from public.profiles p
  where auth.uid() is not null
    and p.id <> auth.uid()
    and length(trim(search_term)) >= 2
    and (
      p.name ilike '%' || trim(search_term) || '%'
      or p.username ilike '%' || trim(search_term) || '%'
    )
  order by
    case
      when lower(coalesce(p.username, '')) = lower(trim(search_term)) then 0
      when coalesce(p.username, '') ilike trim(search_term) || '%' then 1
      when p.name ilike trim(search_term) || '%' then 2
      else 3
    end,
    p.name
  limit 20;
$$;

create or replace function public.list_friends()
returns table (
  id uuid,
  name text,
  username text,
  avatar_type text,
  avatar_value text,
  friended_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.name,
    p.username,
    p.avatar_type,
    p.avatar_value,
    f.created_at as friended_at
  from public.friends f
  join public.profiles p on p.id = f.friend_id
  where auth.uid() is not null
    and f.user_id = auth.uid()
  order by f.created_at desc;
$$;

create or replace function public.add_friend(friend_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to add friends.';
  end if;

  if friend_profile_id = auth.uid() then
    raise exception 'You cannot add yourself as a friend.';
  end if;

  insert into public.friends (user_id, friend_id)
  values (auth.uid(), friend_profile_id)
  on conflict (user_id, friend_id) do nothing;
end;
$$;

create or replace function public.remove_friend(friend_profile_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.friends
  where auth.uid() is not null
    and user_id = auth.uid()
    and friend_id = friend_profile_id;
$$;
