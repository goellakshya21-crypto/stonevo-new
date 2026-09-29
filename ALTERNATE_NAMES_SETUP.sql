-- Alternate names for stones
-- ------------------------------------------------------------------
-- Other trade names a stone is known by (e.g. "Volakas" for Angelo White).
-- Typed in the admin panel (add + edit stone); the gallery search matches
-- them alongside the real name.
--
-- Run once in Supabase → SQL Editor. Safe to re-run.

ALTER TABLE public.stones
    ADD COLUMN IF NOT EXISTS alternate_names text[] NOT NULL DEFAULT '{}';
