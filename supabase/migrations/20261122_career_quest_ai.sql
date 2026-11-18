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
create policy "student_career_quests_all"
  on public.student_career_quests
  for all
  to anon, authenticated
  using (true)
  with check (true);
