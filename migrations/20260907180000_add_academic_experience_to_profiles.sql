-- Keep this migration safe for both fresh environments and databases where
-- the column was added manually before migrations were version controlled.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS academic_experience jsonb;

UPDATE public.profiles
SET academic_experience = '[]'::jsonb
WHERE academic_experience IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN academic_experience SET DEFAULT '[]'::jsonb,
  ALTER COLUMN academic_experience SET NOT NULL;
