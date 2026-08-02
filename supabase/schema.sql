-- ========================================================
-- çetele (cetele.online) Supabase Schema
-- Run this in your Supabase SQL Editor to enable Cloud Sync
-- ========================================================

-- 1. Create user_tabs table (Active Tabs)
CREATE TABLE IF NOT EXISTS public.user_tabs (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content TEXT NOT NULL DEFAULT '',
  position INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create saved_library table (Saved Tabs Library)
CREATE TABLE IF NOT EXISTS public.saved_library (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content TEXT NOT NULL DEFAULT '',
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.user_tabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_library ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for user_tabs
CREATE POLICY "Users can select own tabs" ON public.user_tabs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tabs" ON public.user_tabs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tabs" ON public.user_tabs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tabs" ON public.user_tabs FOR DELETE USING (auth.uid() = user_id);

-- 5. RLS Policies for saved_library
CREATE POLICY "Users can select own library" ON public.saved_library FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own library" ON public.saved_library FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own library" ON public.saved_library FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own library" ON public.saved_library FOR DELETE USING (auth.uid() = user_id);

-- 6. Fast Lookup Indexes
CREATE INDEX IF NOT EXISTS idx_user_tabs_user_id ON public.user_tabs(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_library_user_id ON public.saved_library(user_id);
