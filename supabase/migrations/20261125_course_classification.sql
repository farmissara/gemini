ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS course_type TEXT,
  ADD COLUMN IF NOT EXISTS learning_area TEXT;

UPDATE public.courses
SET course_type = category
WHERE course_type IS NULL
  AND category IN ('core', 'elective', 'activities');

UPDATE public.courses
SET learning_area = CASE
  WHEN department ILIKE '%ภาษาไทย%' OR title_th ILIKE '%ภาษาไทย%' OR code ILIKE 'ท%' OR code ILIKE 'TH%' THEN 'thai'
  WHEN department ILIKE '%คณิต%' OR title_th ILIKE '%คณิต%' OR code ILIKE 'ค%' OR code ILIKE 'MA%' THEN 'math'
  WHEN department ILIKE '%วิทยาศาสตร์%' OR department ILIKE '%เทคโนโลยี%'
    OR title_th ILIKE '%วิทยาศาสตร์%' OR title_th ILIKE '%คอมพิวเตอร์%'
    OR code ILIKE 'ว%' OR code ILIKE 'SC%' OR code ILIKE 'CS%' THEN 'science_tech'
  WHEN department ILIKE '%สังคม%' OR title_th ILIKE '%สังคม%' OR code ILIKE 'ส%' OR code ILIKE 'SO%' THEN 'social'
  WHEN department ILIKE '%สุขศึกษา%' OR department ILIKE '%พลศึกษา%'
    OR title_th ILIKE '%สุขศึกษา%' OR title_th ILIKE '%พลศึกษา%'
    OR code ILIKE 'พ%' OR code ILIKE 'PE%' THEN 'health_pe'
  WHEN department ILIKE '%ศิลปะ%' OR title_th ILIKE '%ศิลปะ%' OR title_th ILIKE '%ดนตรี%' OR code ILIKE 'ศ%' THEN 'arts'
  WHEN department ILIKE '%การงาน%' OR department ILIKE '%อาชีพ%'
    OR title_th ILIKE '%อาชีพ%' OR code ILIKE 'ง%' THEN 'career_tech'
  WHEN department ILIKE '%ภาษาต่างประเทศ%' OR title_th ILIKE '%ภาษาอังกฤษ%'
    OR title_th ILIKE '%ภาษาจีน%' OR title_th ILIKE '%ภาษาญี่ปุ่น%'
    OR code ILIKE 'ต%' OR code ILIKE 'EN%' THEN 'foreign_lang'
  WHEN category = 'stem' THEN 'science_tech'
  WHEN category = 'language' THEN 'foreign_lang'
  WHEN category = 'arts' THEN 'arts'
  WHEN category = 'social' THEN 'social'
  WHEN category = 'pe' THEN 'health_pe'
  WHEN category = 'career' THEN 'career_tech'
  ELSE NULL
END
WHERE learning_area IS NULL;
