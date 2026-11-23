-- Career Quest AI (เส้นทางสู่อาชีพในฝัน) Persistence Migration
-- Stores student dream career profiles, pinned comparisons (up to 3), Vibe Quiz matches,
-- completed 3-tier AI quests, Role-Play skill scores, AI Coach history, and teacher/parent sharing toggle.

create table if not exists public.student_career_quests (
  school_id text not null,
  user_id text not null,
  student_id text,
  student_name text not null default 'นักเรียน',
  grade_level text,
  active_career_id text,
  pinned_careers jsonb not null default '[]'::jsonb,
  vibe_quiz_answers jsonb not null default '[]'::jsonb,
  vibe_matches jsonb not null default '[]'::jsonb,
  completed_quest_ids jsonb not null default '[]'::jsonb,
  roleplay_runs_count integer not null default 0,
  latest_roleplay_skills jsonb,
  coach_messages jsonb not null default '[]'::jsonb,
  career_exp integer not null default 0,
  unlocked_titles jsonb not null default '[]'::jsonb,
  equipped_career_title text,
  share_with_teachers_parents boolean not null default true,
  last_readiness_percent integer not null default 0,
  last_readiness_level text not null default 'Lv.1 นักสำรวจ',
  updated_at timestamptz not null default now(),
  primary key (school_id, user_id)
);

create index if not exists idx_student_career_quests_school_share
  on public.student_career_quests (school_id, share_with_teachers_parents, updated_at desc);

create index if not exists idx_student_career_quests_student
  on public.student_career_quests (school_id, student_id);

alter table public.student_career_quests enable row level security;

drop policy if exists "student_career_quests_all" on public.student_career_quests;
drop policy if exists "career_quest_owner_read" on public.student_career_quests;
create policy "career_quest_owner_read" on public.student_career_quests
  for select to authenticated
  using (user_id = auth.uid()::text and public.has_school_role(school_id, ARRAY['student']));
drop policy if exists "career_quest_shared_school_staff_read" on public.student_career_quests;
create policy "career_quest_shared_school_staff_read" on public.student_career_quests
  for select to authenticated using (
    share_with_teachers_parents and public.has_school_role(school_id, ARRAY['super_admin', 'admin', 'teacher'])
  );
drop policy if exists "career_quest_shared_parent_read" on public.student_career_quests;
create policy "career_quest_shared_parent_read" on public.student_career_quests
  for select to authenticated using (
    share_with_teachers_parents and student_id is not null
    and public.has_school_role(school_id, ARRAY['parent'])
    and exists (select 1 from public.parent_student_links link
      where link.profile_id = auth.uid() and link.school_id = student_career_quests.school_id
        and link.student_id = student_career_quests.student_id)
  );
drop policy if exists "career_quest_owner_insert" on public.student_career_quests;
create policy "career_quest_owner_insert" on public.student_career_quests
  for insert to authenticated with check (
    user_id = auth.uid()::text and public.has_school_role(school_id, ARRAY['student'])
    and student_id is not distinct from (select profile.student_id from public.user_profiles profile where profile.id = auth.uid())
  );
drop policy if exists "career_quest_owner_update" on public.student_career_quests;
create policy "career_quest_owner_update" on public.student_career_quests
  for update to authenticated using (
    user_id = auth.uid()::text and public.has_school_role(school_id, ARRAY['student'])
  ) with check (
    user_id = auth.uid()::text and public.has_school_role(school_id, ARRAY['student'])
    and student_id is not distinct from (select profile.student_id from public.user_profiles profile where profile.id = auth.uid())
  );
drop policy if exists "career_quest_owner_delete" on public.student_career_quests;
create policy "career_quest_owner_delete" on public.student_career_quests
  for delete to authenticated using (
    user_id = auth.uid()::text and public.has_school_role(school_id, ARRAY['student'])
  );
revoke all on public.student_career_quests from public, anon;
grant select, insert, update, delete on public.student_career_quests to authenticated;

notify pgrst, 'reload schema';
