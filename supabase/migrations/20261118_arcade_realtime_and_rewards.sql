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

-- Arcade data is private to active school members. Students can only change
-- their own game profile; school staff can review redemptions and manage rewards.
drop policy if exists "arcade_player_profiles_all" on public.arcade_player_profiles;
drop policy if exists "arcade_player_profiles_school_read" on public.arcade_player_profiles;
create policy "arcade_player_profiles_school_read"
  on public.arcade_player_profiles
  for select
  to authenticated
  using (
    public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher', 'student', 'parent'])
  );
drop policy if exists "arcade_player_profiles_self_insert" on public.arcade_player_profiles;
create policy "arcade_player_profiles_self_insert"
  on public.arcade_player_profiles
  for insert
  to authenticated
  with check (
    user_id = auth.uid()::text
    and role = public.current_user_role()
    and role IN ('student', 'teacher')
    and public.has_school_role(school_id, ARRAY['student', 'teacher'])
  );
drop policy if exists "arcade_player_profiles_self_update" on public.arcade_player_profiles;
create policy "arcade_player_profiles_self_update"
  on public.arcade_player_profiles
  for update
  to authenticated
  using (
    user_id = auth.uid()::text
    and role = public.current_user_role()
    and role IN ('student', 'teacher')
    and public.has_school_role(school_id, ARRAY['student', 'teacher'])
  )
  with check (
    user_id = auth.uid()::text
    and role = public.current_user_role()
    and role IN ('student', 'teacher')
    and public.has_school_role(school_id, ARRAY['student', 'teacher'])
  );

drop policy if exists "arcade_reward_redemptions_all" on public.arcade_reward_redemptions;
drop policy if exists "arcade_reward_redemptions_school_read" on public.arcade_reward_redemptions;
create policy "arcade_reward_redemptions_school_read"
  on public.arcade_reward_redemptions
  for select
  to authenticated
  using (
    (
      user_id = auth.uid()::text
      and public.has_school_role(school_id, ARRAY['student'])
    )
    or public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
  );
drop policy if exists "arcade_reward_redemptions_student_insert" on public.arcade_reward_redemptions;
create policy "arcade_reward_redemptions_student_insert"
  on public.arcade_reward_redemptions
  for insert
  to authenticated
  with check (
    user_id = auth.uid()::text
    and public.has_school_role(school_id, ARRAY['student'])
    and status IN ('pending', 'approved')
    and reviewed_by IS NULL
    and reviewed_at IS NULL
  );
drop policy if exists "arcade_reward_redemptions_staff_update" on public.arcade_reward_redemptions;
create policy "arcade_reward_redemptions_staff_update"
  on public.arcade_reward_redemptions
  for update
  to authenticated
  using (public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher']))
  with check (public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher']));

drop policy if exists "arcade_custom_rewards_all" on public.arcade_custom_rewards;
drop policy if exists "arcade_custom_rewards_school_read" on public.arcade_custom_rewards;
create policy "arcade_custom_rewards_school_read"
  on public.arcade_custom_rewards
  for select
  to authenticated
  using (
    public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher', 'student', 'parent'])
  );
drop policy if exists "arcade_custom_rewards_staff_insert" on public.arcade_custom_rewards;
create policy "arcade_custom_rewards_staff_insert"
  on public.arcade_custom_rewards
  for insert
  to authenticated
  with check (public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher']));
drop policy if exists "arcade_custom_rewards_staff_update" on public.arcade_custom_rewards;
create policy "arcade_custom_rewards_staff_update"
  on public.arcade_custom_rewards
  for update
  to authenticated
  using (public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher']))
  with check (public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher']));

revoke all on public.arcade_player_profiles,
  public.arcade_reward_redemptions,
  public.arcade_custom_rewards from public, anon;
grant select, insert, update on public.arcade_player_profiles to authenticated;
grant select, insert, update on public.arcade_reward_redemptions to authenticated;
grant select, insert, update on public.arcade_custom_rewards to authenticated;
grant select, insert, update, delete on public.arcade_player_profiles,
  public.arcade_reward_redemptions,
  public.arcade_custom_rewards to service_role;

-- Prevent a student client from changing redemption review fields.
revoke update on public.arcade_reward_redemptions from authenticated;
grant update (status, reviewed_by, reviewed_at, teacher_note)
  on public.arcade_reward_redemptions to authenticated;

notify pgrst, 'reload schema';
