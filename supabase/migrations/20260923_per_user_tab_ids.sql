-- ========================================================
-- Migration: per-user tab ids + last-write-wins
-- Run once in the Supabase SQL Editor on databases created from the
-- original schema.sql. Until it runs, the client falls back to upserting
-- on 'id' (the old behaviour, where users' tab ids can collide).
-- ========================================================

BEGIN;

-- 1. Tab and library ids only need to be unique per user.
--    With a global primary key, a second user's 'tab-1' collided with the
--    first user's row and RLS rejected the whole upsert.
ALTER TABLE public.user_tabs DROP CONSTRAINT IF EXISTS user_tabs_pkey;
ALTER TABLE public.user_tabs ADD PRIMARY KEY (user_id, id);

ALTER TABLE public.saved_library DROP CONSTRAINT IF EXISTS saved_library_pkey;
ALTER TABLE public.saved_library ADD PRIMARY KEY (user_id, id);

-- 2. Stop updates from moving a row to another user_id.
DROP POLICY IF EXISTS "Users can update own tabs" ON public.user_tabs;
CREATE POLICY "Users can update own tabs" ON public.user_tabs
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own library" ON public.saved_library;
CREATE POLICY "Users can update own library" ON public.saved_library
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Last-write-wins: ignore tab updates older than the stored row.
CREATE OR REPLACE FUNCTION public.user_tabs_skip_stale_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.updated_at < OLD.updated_at THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_tabs_skip_stale_update ON public.user_tabs;
CREATE TRIGGER user_tabs_skip_stale_update
  BEFORE UPDATE ON public.user_tabs
  FOR EACH ROW EXECUTE FUNCTION public.user_tabs_skip_stale_update();

COMMIT;
