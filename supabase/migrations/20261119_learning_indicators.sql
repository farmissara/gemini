BEGIN;

CREATE TABLE IF NOT EXISTS public.learning_indicator_sets (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  standard_code TEXT,
  academic_year TEXT NOT NULL DEFAULT '',
  semester TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.learning_indicators (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  set_id TEXT NOT NULL REFERENCES public.learning_indicator_sets(id) ON DELETE CASCADE,
  code TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  description TEXT,
  max_score NUMERIC(8,2) NOT NULL DEFAULT 3 CHECK (max_score > 0),
  sort_order INTEGER NOT NULL DEFAULT 1,
  academic_year TEXT NOT NULL DEFAULT '',
  semester TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.student_learning_indicator_scores (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  set_id TEXT NOT NULL REFERENCES public.learning_indicator_sets(id) ON DELETE CASCADE,
  indicator_id TEXT NOT NULL REFERENCES public.learning_indicators(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  score NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (score >= 0),
  result TEXT NOT NULL DEFAULT 'not_pass' CHECK (result IN ('pass','not_pass')),
  evidence TEXT,
  assessed_by TEXT,
  assessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (school_id, set_id, indicator_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_learning_indicator_sets_scope
  ON public.learning_indicator_sets(school_id, course_id, academic_year, semester);
CREATE INDEX IF NOT EXISTS idx_learning_indicators_set
  ON public.learning_indicators(set_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_indicator_scores_set_student
  ON public.student_learning_indicator_scores(set_id, student_id);

ALTER TABLE public.learning_indicator_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_learning_indicator_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "indicator sets read for school" ON public.learning_indicator_sets FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.user_profiles p
  WHERE p.id = auth.uid() AND p.status = 'active'
    AND (p.role = 'super_admin' OR p.school_id = learning_indicator_sets.school_id)
));

CREATE POLICY "indicator sets write for staff" ON public.learning_indicator_sets FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.user_profiles p
  WHERE p.id = auth.uid() AND p.status = 'active'
    AND (p.role = 'super_admin' OR (p.school_id = learning_indicator_sets.school_id AND p.role IN ('admin','teacher')))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.user_profiles p
  WHERE p.id = auth.uid() AND p.status = 'active'
    AND (p.role = 'super_admin' OR (p.school_id = learning_indicator_sets.school_id AND p.role IN ('admin','teacher')))
));

CREATE POLICY "indicators read for school" ON public.learning_indicators FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.user_profiles p
  WHERE p.id = auth.uid() AND p.status = 'active'
    AND (p.role = 'super_admin' OR p.school_id = learning_indicators.school_id)
));

CREATE POLICY "indicators write for staff" ON public.learning_indicators FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.user_profiles p
  WHERE p.id = auth.uid() AND p.status = 'active'
    AND (p.role = 'super_admin' OR (p.school_id = learning_indicators.school_id AND p.role IN ('admin','teacher')))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.user_profiles p
  WHERE p.id = auth.uid() AND p.status = 'active'
    AND (p.role = 'super_admin' OR (p.school_id = learning_indicators.school_id AND p.role IN ('admin','teacher')))
));

CREATE POLICY "indicator scores read for school" ON public.student_learning_indicator_scores FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.user_profiles p
  WHERE p.id = auth.uid() AND p.status = 'active'
    AND (p.role = 'super_admin' OR p.school_id = student_learning_indicator_scores.school_id)
));

CREATE POLICY "indicator scores write for staff" ON public.student_learning_indicator_scores FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.user_profiles p
  WHERE p.id = auth.uid() AND p.status = 'active'
    AND (p.role = 'super_admin' OR (p.school_id = student_learning_indicator_scores.school_id AND p.role IN ('admin','teacher')))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.user_profiles p
  WHERE p.id = auth.uid() AND p.status = 'active'
    AND (p.role = 'super_admin' OR (p.school_id = student_learning_indicator_scores.school_id AND p.role IN ('admin','teacher')))
));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_indicator_sets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_indicators TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_learning_indicator_scores TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
