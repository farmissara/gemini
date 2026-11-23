-- Replace the permissive arcade policies from 20261118_arcade_realtime_and_rewards.sql.
-- Keep leaderboard reads scoped to active members of the selected school, while
-- limiting writes to the signed-in player or staff in that same school.

begin;

alter table public.arcade_player_profiles enable row level security;
alter table public.arcade_reward_redemptions enable row level security;
alter table public.arcade_custom_rewards enable row level security;

drop policy if exists "arcade_player_profiles_all" on public.arcade_player_profiles;
drop policy if exists "arcade_player_profiles_school_read" on public.arcade_player_profiles;
create policy "arcade_player_profiles_school_read"
  on public.arcade_player_profiles for select to authenticated
  using (public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher', 'student', 'parent']));

drop policy if exists "arcade_player_profiles_self_insert" on public.arcade_player_profiles;
create policy "arcade_player_profiles_self_insert"
  on public.arcade_player_profiles for insert to authenticated
  with check (
    user_id = auth.uid()::text
    and role = public.current_user_role()
    and role IN ('student', 'teacher')
    and public.has_school_role(school_id, ARRAY['student', 'teacher'])
  );

drop policy if exists "arcade_player_profiles_self_update" on public.arcade_player_profiles;
create policy "arcade_player_profiles_self_update"
  on public.arcade_player_profiles for update to authenticated
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
  on public.arcade_reward_redemptions for select to authenticated
  using (
    (user_id = auth.uid()::text and public.has_school_role(school_id, ARRAY['student']))
    or public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
  );

drop policy if exists "arcade_reward_redemptions_student_insert" on public.arcade_reward_redemptions;
create policy "arcade_reward_redemptions_student_insert"
  on public.arcade_reward_redemptions for insert to authenticated
  with check (
    user_id = auth.uid()::text
    and public.has_school_role(school_id, ARRAY['student'])
    and status IN ('pending', 'approved')
    and reviewed_by IS NULL
    and reviewed_at IS NULL
  );

drop policy if exists "arcade_reward_redemptions_staff_update" on public.arcade_reward_redemptions;
create policy "arcade_reward_redemptions_staff_update"
  on public.arcade_reward_redemptions for update to authenticated
  using (public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher']))
  with check (public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher']));

drop policy if exists "arcade_custom_rewards_all" on public.arcade_custom_rewards;
drop policy if exists "arcade_custom_rewards_school_read" on public.arcade_custom_rewards;
create policy "arcade_custom_rewards_school_read"
  on public.arcade_custom_rewards for select to authenticated
  using (public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher', 'student', 'parent']));

drop policy if exists "arcade_custom_rewards_staff_insert" on public.arcade_custom_rewards;
create policy "arcade_custom_rewards_staff_insert"
  on public.arcade_custom_rewards for insert to authenticated
  with check (public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher']));

drop policy if exists "arcade_custom_rewards_staff_update" on public.arcade_custom_rewards;
create policy "arcade_custom_rewards_staff_update"
  on public.arcade_custom_rewards for update to authenticated
  using (public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher']))
  with check (public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher']));

revoke all on public.arcade_player_profiles,
  public.arcade_reward_redemptions,
  public.arcade_custom_rewards from public, anon;
grant select, insert, update on public.arcade_player_profiles to authenticated;
grant select, insert, update on public.arcade_reward_redemptions to authenticated;
grant select, insert, update on public.arcade_custom_rewards to authenticated;

-- Client-side students may submit redemption requests, but cannot set review fields.
revoke update on public.arcade_reward_redemptions from authenticated;
grant update (status, reviewed_by, reviewed_at, teacher_note)
  on public.arcade_reward_redemptions to authenticated;

grant select, insert, update, delete on public.arcade_player_profiles,
  public.arcade_reward_redemptions,
  public.arcade_custom_rewards to service_role;

notify pgrst, 'reload schema';
commit;
