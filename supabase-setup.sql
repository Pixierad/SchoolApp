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

-- ------------------------------------------------------------------
-- Temporary friend chat rooms.
-- Rooms are temporary, membership-gated, and can only be created with
-- people already in the creator's friends list. "Deleting" a chat hides
-- it for the signed-in user instead of deleting everyone else's history.
-- ------------------------------------------------------------------

create extension if not exists pgcrypto;

create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create table if not exists public.chat_room_members (
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  is_pinned boolean not null default false,
  hidden_at timestamptz,
  primary key (room_id, user_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  check (length(trim(body)) > 0),
  check (length(body) <= 2000)
);

create index if not exists chat_rooms_expires_at_idx on public.chat_rooms(expires_at);
create index if not exists chat_room_members_user_id_idx on public.chat_room_members(user_id);
create index if not exists chat_room_members_room_id_idx on public.chat_room_members(room_id);
create index if not exists chat_messages_room_id_created_at_idx
  on public.chat_messages(room_id, created_at desc);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'chat_messages'
    ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end;
$$;

alter table public.chat_rooms enable row level security;
alter table public.chat_room_members enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "chat_rooms_select_member" on public.chat_rooms;
drop policy if exists "chat_room_members_select_member" on public.chat_room_members;
drop policy if exists "chat_room_members_update_self" on public.chat_room_members;
drop policy if exists "chat_messages_select_member" on public.chat_messages;
drop policy if exists "chat_messages_insert_member" on public.chat_messages;

create policy "chat_rooms_select_member"
  on public.chat_rooms for select using (
    exists (
      select 1
      from public.chat_room_members m
      where m.room_id = chat_rooms.id
        and m.user_id = auth.uid()
        and m.hidden_at is null
    )
  );

create policy "chat_room_members_select_member"
  on public.chat_room_members for select using (user_id = auth.uid());

create policy "chat_room_members_update_self"
  on public.chat_room_members for update using (
    user_id = auth.uid()
  ) with check (
    user_id = auth.uid()
  );

create policy "chat_messages_select_member"
  on public.chat_messages for select using (
    deleted_at is null
    and exists (
      select 1
      from public.chat_room_members m
      join public.chat_rooms r on r.id = m.room_id
      where m.room_id = chat_messages.room_id
        and m.user_id = auth.uid()
        and m.hidden_at is null
        and r.expires_at > now()
    )
  );

create policy "chat_messages_insert_member"
  on public.chat_messages for insert with check (
    sender_id = auth.uid()
    and length(trim(body)) > 0
    and exists (
      select 1
      from public.chat_room_members m
      join public.chat_rooms r on r.id = m.room_id
      where m.room_id = chat_messages.room_id
        and m.user_id = auth.uid()
        and m.hidden_at is null
        and r.expires_at > now()
    )
  );

create or replace function public.chat_member_profiles(room_profile_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'username', p.username,
        'avatar_type', p.avatar_type,
        'avatar_value', p.avatar_value
      )
      order by case when p.id = auth.uid() then 0 else 1 end, p.name
    ),
    '[]'::jsonb
  )
  from public.chat_room_members m
  join public.profiles p on p.id = m.user_id
  where m.room_id = room_profile_id
    and exists (
      select 1
      from public.chat_room_members self
      where self.room_id = room_profile_id
        and self.user_id = auth.uid()
        and self.hidden_at is null
    );
$$;

create or replace function public.create_chat_room(
  room_name text,
  friend_ids uuid[],
  lifetime_hours integer default 24
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_friend_ids uuid[];
  new_room_id uuid;
  requested_count integer;
  friend_count integer;
  ttl_hours integer;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to create a chat.';
  end if;

  select array(
    select distinct x
    from unnest(coalesce(friend_ids, array[]::uuid[])) as x
    where x is not null and x <> auth.uid()
  ) into clean_friend_ids;

  requested_count := coalesce(array_length(clean_friend_ids, 1), 0);
  if requested_count = 0 then
    raise exception 'Choose at least one friend for the chat.';
  end if;

  select count(*) into friend_count
  from public.friends f
  where f.user_id = auth.uid()
    and f.friend_id = any(clean_friend_ids);

  if friend_count <> requested_count then
    raise exception 'Chats can only include people in your friends list.';
  end if;

  ttl_hours := least(greatest(coalesce(lifetime_hours, 24), 1), 168);

  insert into public.chat_rooms (name, created_by, expires_at)
  values (left(trim(coalesce(room_name, '')), 80), auth.uid(), now() + make_interval(hours => ttl_hours))
  returning id into new_room_id;

  insert into public.chat_room_members (room_id, user_id, last_read_at)
  values (new_room_id, auth.uid(), now());

  insert into public.chat_room_members (room_id, user_id)
  select new_room_id, x
  from unnest(clean_friend_ids) as x;

  return new_room_id;
end;
$$;

create or replace function public.list_chat_rooms()
returns table (
  id uuid,
  name text,
  created_by uuid,
  created_at timestamptz,
  expires_at timestamptz,
  is_pinned boolean,
  last_read_at timestamptz,
  last_message_body text,
  last_message_at timestamptz,
  unread_count bigint,
  members jsonb
)
language sql
security definer
set search_path = public
as $$
  select
    r.id,
    r.name,
    r.created_by,
    r.created_at,
    r.expires_at,
    self.is_pinned,
    self.last_read_at,
    last_msg.body as last_message_body,
    last_msg.created_at as last_message_at,
    (
      select count(*)
      from public.chat_messages unread
      where unread.room_id = r.id
        and unread.sender_id <> auth.uid()
        and unread.deleted_at is null
        and (self.last_read_at is null or unread.created_at > self.last_read_at)
    ) as unread_count,
    public.chat_member_profiles(r.id) as members
  from public.chat_room_members self
  join public.chat_rooms r on r.id = self.room_id
  left join lateral (
    select body, created_at
    from public.chat_messages lm
    where lm.room_id = r.id
      and lm.deleted_at is null
    order by lm.created_at desc
    limit 1
  ) last_msg on true
  where auth.uid() is not null
    and self.user_id = auth.uid()
    and self.hidden_at is null
    and r.expires_at > now()
  order by
    self.is_pinned desc,
    coalesce(last_msg.created_at, r.created_at) desc;
$$;

create or replace function public.list_chat_messages(room_profile_id uuid)
returns table (
  id uuid,
  room_id uuid,
  sender_id uuid,
  body text,
  created_at timestamptz,
  sender_name text,
  sender_username text,
  sender_avatar_type text,
  sender_avatar_value text
)
language sql
security definer
set search_path = public
as $$
  select
    msg.id,
    msg.room_id,
    msg.sender_id,
    msg.body,
    msg.created_at,
    p.name as sender_name,
    p.username as sender_username,
    p.avatar_type as sender_avatar_type,
    p.avatar_value as sender_avatar_value
  from public.chat_messages msg
  join public.chat_rooms r on r.id = msg.room_id
  join public.chat_room_members self on self.room_id = msg.room_id
  left join public.profiles p on p.id = msg.sender_id
  where auth.uid() is not null
    and self.user_id = auth.uid()
    and self.hidden_at is null
    and r.expires_at > now()
    and msg.room_id = room_profile_id
    and msg.deleted_at is null
  order by msg.created_at asc
  limit 200;
$$;

create or replace function public.send_chat_message(room_profile_id uuid, message_body text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_message_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to send messages.';
  end if;

  if length(trim(coalesce(message_body, ''))) = 0 then
    raise exception 'Message cannot be empty.';
  end if;

  if not exists (
    select 1
    from public.chat_room_members m
    join public.chat_rooms r on r.id = m.room_id
    where m.room_id = room_profile_id
      and m.user_id = auth.uid()
      and m.hidden_at is null
      and r.expires_at > now()
  ) then
    raise exception 'This chat is no longer available.';
  end if;

  insert into public.chat_messages (room_id, sender_id, body)
  values (room_profile_id, auth.uid(), left(trim(message_body), 2000))
  returning id into new_message_id;

  update public.chat_room_members
  set last_read_at = now(), hidden_at = null
  where room_id = room_profile_id
    and user_id = auth.uid();

  return new_message_id;
end;
$$;

create or replace function public.mark_chat_read(room_profile_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.chat_room_members
  set last_read_at = now()
  where auth.uid() is not null
    and room_id = room_profile_id
    and user_id = auth.uid()
    and hidden_at is null;
$$;

create or replace function public.set_chat_pinned(room_profile_id uuid, pinned boolean)
returns void
language sql
security definer
set search_path = public
as $$
  update public.chat_room_members
  set is_pinned = coalesce(pinned, false)
  where auth.uid() is not null
    and room_id = room_profile_id
    and user_id = auth.uid()
    and hidden_at is null;
$$;

create or replace function public.hide_chat_room(room_profile_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.chat_room_members
  set hidden_at = now(), is_pinned = false
  where auth.uid() is not null
    and room_id = room_profile_id
    and user_id = auth.uid();
$$;
