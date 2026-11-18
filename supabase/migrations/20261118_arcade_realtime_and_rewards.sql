-- EduVerse Arcade Persistence, School Leaderboard & Reward Redemption Migration
-- Run this idempotent script in Supabase SQL Editor to enable cross-device persistence
-- for game EXP/Gems, Daily Play Streak, Profile Frames/Titles, and Teacher Perk Approvals.

create table if not exists public.arcade_player_profiles (
  school_id text not null,
  user_id text not null,
  student_id text,
  display_name text not null default 'ผู้เล่น',
  role text not null default 'student',
  avatar_url text not null default '',
  exp integer not null default 0,
  gems integer not null default 0,
  rank_title text not null default 'Rookie Explorer',
  battle_wins integer not null default 0,
  win_streak integer not null default 0,
  daily_streak integer not null default 0,
  last_played_date text,
  equipped_frame_id text not null default 'frame-default',
  equipped_title text,
  unlocked_item_ids jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (school_id, user_id)
);

create index if not exists idx_arcade_player_profiles_school_exp
  on public.arcade_player_profiles (school_id, exp desc);

create table if not exists public.arcade_reward_redemptions (
  id text primary key,
  school_id text not null,
  user_id text not null,
  student_name text not null,
  grade_room text,
  item_id text not null,
  item_title_th text not null,
  cost_gems integer not null default 0,
  category text not null default 'perk',
  status text not null default 'pending',
  requested_at timestamptz not null default now(),
  reviewed_by text,
  reviewed_at timestamptz,
  teacher_note text
);

create index if not exists idx_arcade_reward_redemptions_school_status
  on public.arcade_reward_redemptions (school_id, status, requested_at desc);

create table if not exists public.arcade_custom_rewards (
  id text primary key,
  school_id text not null,
  title_th text not null,
  title_en text not null default '',
  cost_gems integer not null default 50,
  category text not null default 'perk',
  stock integer not null default 20,
  icon_name text not null default 'gift',
  description_th text not null default '',
  requires_approval boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_arcade_custom_rewards_school
  on public.arcade_custom_rewards (school_id, created_at desc);

alter table public.arcade_player_profiles enable row level security;
alter table public.arcade_reward_redemptions enable row level security;
alter table public.arcade_custom_rewards enable row level security;

drop policy if exists "arcade_player_profiles_all" on public.arcade_player_profiles;
create policy "arcade_player_profiles_all"
  on public.arcade_player_profiles
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "arcade_reward_redemptions_all" on public.arcade_reward_redemptions;
create policy "arcade_reward_redemptions_all"
  on public.arcade_reward_redemptions
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "arcade_custom_rewards_all" on public.arcade_custom_rewards;
create policy "arcade_custom_rewards_all"
  on public.arcade_custom_rewards
  for all
  to anon, authenticated
  using (true)
  with check (true);
