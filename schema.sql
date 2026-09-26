-- RoamRIT — Supabase schema
-- Run this in Supabase: Project → SQL Editor → New query → paste → Run.
-- Safe on a fresh project. If a table below already exists with a different
-- shape, drop it first (drop table public.<name> cascade;) before rerunning.

create extension if not exists "pgcrypto"; -- gives us gen_random_uuid()

-- ============================================================
-- spots — the places on the map
-- ============================================================
create table if not exists public.spots (
  id text primary key,
  name text not null,
  category text not null check (category in ('study', 'food', 'chill', 'hangout')),
  sector text not null,
  x numeric not null,
  y numeric not null,
  distance_min integer not null default 5,
  rating numeric,
  description text default '',
  created_at timestamptz not null default now()
);
alter table public.spots enable row level security;
create policy "Spots are viewable by everyone" on public.spots
  for select using (true);
create policy "Anyone can add a spot" on public.spots
  for insert with check (true);
create policy "Anyone can update a spot's rating" on public.spots
  for update using (true);

-- ============================================================
-- checkins — reviews/check-ins attached to a spot
-- ============================================================
create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  spot_id text not null references public.spots(id) on delete cascade,
  vibe text not null,
  noise integer not null check (noise between 1 and 5),
  outlets integer not null check (outlets between 1 and 5),
  comfort integer not null check (comfort between 1 and 5),
  note text default '',
  created_at timestamptz not null default now()
);
alter table public.checkins enable row level security;
create policy "Checkins are viewable by everyone" on public.checkins
  for select using (true);
create policy "Anyone can post a checkin" on public.checkins
  for insert with check (true);

-- ============================================================
-- profiles — one row per account, created automatically on sign-up
-- (this is what gives the community board a display name for each user)
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "Profiles are viewable by everyone" on public.profiles
  for select using (true);
create policy "Users can insert their own profile" on public.profiles
  for insert with check (auth.uid() = id);
create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);

-- Whenever someone signs up in auth.users, create a matching profiles row.
-- Uses the display name passed at sign-up, or falls back to the email prefix.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- posts — the community board
-- ============================================================
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
alter table public.posts enable row level security;
create policy "Posts are viewable by everyone" on public.posts
  for select using (true);
create policy "Logged-in users can post" on public.posts
  for insert with check (auth.uid() = user_id);
create policy "Users can delete their own posts" on public.posts
  for delete using (auth.uid() = user_id);

-- ============================================================
-- Points / gamification
-- ============================================================
-- Running total per user, plus the columns needed to attribute a spot,
-- checkin or post back to the person who created it (spots/checkins had
-- no author column before — everything was anonymous-but-open).
alter table public.profiles add column if not exists points integer not null default 0;
alter table public.spots add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.checkins add column if not exists user_id uuid references auth.users(id) on delete set null;
-- Community posts must now be tied to a spot (the app enforces choosing one
-- before posting). Kept nullable at the database level, with delete-set-null
-- on the referenced spot, so removing a spot never breaks old posts.
alter table public.posts add column if not exists spot_id text references public.spots(id) on delete set null;

-- The existing "Users can update their own profile" policy is meant for
-- editing display_name, but as written it would also let someone set their
-- own points to anything via the client. This trigger blocks any change to
-- `points` unless it's coming from the award_points() helper below (which
-- flips a session-local flag while it runs).
create or replace function public.protect_points()
returns trigger
language plpgsql
as $$
begin
  if new.points is distinct from old.points
     and coalesce(current_setting('app.awarding_points', true), '') <> 'true' then
    new.points := old.points;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_profile_points on public.profiles;
create trigger protect_profile_points
  before update on public.profiles
  for each row execute procedure public.protect_points();

create or replace function public.award_points(p_user_id uuid, p_amount integer)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if p_user_id is null then return; end if;
  perform set_config('app.awarding_points', 'true', true);
  update public.profiles set points = points + p_amount where id = p_user_id;
  perform set_config('app.awarding_points', 'false', true);
end;
$$;

-- +10 for posting a review/check-in on an existing spot
create or replace function public.award_points_for_checkin()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform public.award_points(new.user_id, 10);
  return new;
end;
$$;
drop trigger if exists on_checkin_award_points on public.checkins;
create trigger on_checkin_award_points
  after insert on public.checkins
  for each row execute procedure public.award_points_for_checkin();

-- +20 for adding a brand new spot
create or replace function public.award_points_for_spot()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform public.award_points(new.user_id, 20);
  return new;
end;
$$;
drop trigger if exists on_spot_award_points on public.spots;
create trigger on_spot_award_points
  after insert on public.spots
  for each row execute procedure public.award_points_for_spot();

-- +5 for posting to the community board
create or replace function public.award_points_for_post()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform public.award_points(new.user_id, 5);
  return new;
end;
$$;
drop trigger if exists on_post_award_points on public.posts;
create trigger on_post_award_points
  after insert on public.posts
  for each row execute procedure public.award_points_for_post();
