-- ========================================================
-- çetele (cetele.online) Supabase User Tabs Schema
-- Run this in your Supabase SQL Editor to enable Cloud Sync
-- ========================================================

-- 1. Create user_tabs table
CREATE TABLE IF NOT EXISTS public.user_tabs (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content TEXT NOT NULL DEFAULT '',
  position INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.user_tabs ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Users can view their own tabs
CREATE POLICY "Users can select own tabs"
  ON public.user_tabs
  FOR SELECT
  USING (auth.uid() = user_id);

-- 4. Policy: Users can insert/update their own tabs
CREATE POLICY "Users can insert own tabs"
  ON public.user_tabs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tabs"
  ON public.user_tabs
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tabs"
  ON public.user_tabs
  FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_tabs_user_id ON public.user_tabs(user_id);
