-- Career Quest profiles contain private student goals and AI conversation history.
-- Students own edits; staff and linked parents can read only while sharing is enabled.

begin;

alter table public.student_career_quests enable row level security;
drop policy if exists "student_career_quests_all" on public.student_career_quests;
drop policy if exists "career_quest_owner_read" on public.student_career_quests;
drop policy if exists "career_quest_shared_school_staff_read" on public.student_career_quests;
drop policy if exists "career_quest_shared_parent_read" on public.student_career_quests;
drop policy if exists "career_quest_owner_insert" on public.student_career_quests;
drop policy if exists "career_quest_owner_update" on public.student_career_quests;
drop policy if exists "career_quest_owner_delete" on public.student_career_quests;

create policy "career_quest_owner_read"
  on public.student_career_quests for select to authenticated
  using (user_id = auth.uid()::text and public.has_school_role(school_id, ARRAY['student']));

create policy "career_quest_shared_school_staff_read"
  on public.student_career_quests for select to authenticated
  using (
    share_with_teachers_parents
    and public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
  );

create policy "career_quest_shared_parent_read"
  on public.student_career_quests for select to authenticated
  using (
    share_with_teachers_parents
    and student_id is not null
    and exists (
      select 1 from public.parent_student_links link
      where link.profile_id = auth.uid()
        and link.school_id = student_career_quests.school_id
        and link.student_id = student_career_quests.student_id
    )
    and public.has_school_role(school_id, ARRAY['parent'])
  );

create policy "career_quest_owner_insert"
  on public.student_career_quests for insert to authenticated
  with check (
    user_id = auth.uid()::text
    and public.has_school_role(school_id, ARRAY['student'])
    and student_id is not distinct from (
      select profile.student_id from public.user_profiles profile where profile.id = auth.uid()
    )
  );

create policy "career_quest_owner_update"
  on public.student_career_quests for update to authenticated
  using (user_id = auth.uid()::text and public.has_school_role(school_id, ARRAY['student']))
  with check (
    user_id = auth.uid()::text
    and public.has_school_role(school_id, ARRAY['student'])
    and student_id is not distinct from (
      select profile.student_id from public.user_profiles profile where profile.id = auth.uid()
    )
  );

create policy "career_quest_owner_delete"
  on public.student_career_quests for delete to authenticated
  using (user_id = auth.uid()::text and public.has_school_role(school_id, ARRAY['student']));

revoke all on public.student_career_quests from public, anon;
grant select, insert, update, delete on public.student_career_quests to authenticated;
grant select, insert, update, delete on public.student_career_quests to service_role;

notify pgrst, 'reload schema';
commit;
