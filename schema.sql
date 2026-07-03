-- ============================================================================
-- LOVE HUNT DATABASE SCHEMA (ARABIC VERSION)
-- Execute this script in your Supabase SQL Editor.
-- ============================================================================

-- 1. Create Couple Spaces Table
CREATE TABLE IF NOT EXISTS couple_spaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    password_hash TEXT NOT NULL,
    admin_password_hash TEXT NOT NULL,
    his_photo_url TEXT,
    her_photo_url TEXT,
    custom_ui_texts JSONB DEFAULT '{}'::jsonb NOT NULL,
    password_plain TEXT,
    admin_password_plain TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Games Table
CREATE TABLE IF NOT EXISTS games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_space_id UUID REFERENCES couple_spaces(id) ON DELETE CASCADE,
    stages JSONB DEFAULT '[]'::jsonb NOT NULL,
    theme TEXT DEFAULT 'rose_garden'::text NOT NULL,
    customization JSONB DEFAULT '{}'::jsonb NOT NULL,
    final_message TEXT,
    gift_message TEXT,
    celebration_media_url TEXT,
    start_date TIMESTAMP WITH TIME ZONE,
    expiry_date TIMESTAMP WITH TIME ZONE,
    views INTEGER DEFAULT 0 NOT NULL,
    completions INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Custom Music Tracks Table
CREATE TABLE IF NOT EXISTS music_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_space_id UUID REFERENCES couple_spaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Memories Table
CREATE TABLE IF NOT EXISTS memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_space_id UUID REFERENCES couple_spaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    description TEXT NOT NULL,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create Dreams Table
CREATE TABLE IF NOT EXISTS dreams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_space_id UUID REFERENCES couple_spaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    is_achieved BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Create Gallery Table
CREATE TABLE IF NOT EXISTS gallery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_space_id UUID REFERENCES couple_spaces(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    caption TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Create Important Dates Table
CREATE TABLE IF NOT EXISTS important_dates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_space_id UUID REFERENCES couple_spaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Disable Row Level Security (RLS) on all tables for public access
ALTER TABLE couple_spaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE games DISABLE ROW LEVEL SECURITY;
ALTER TABLE music_tracks DISABLE ROW LEVEL SECURITY;
ALTER TABLE memories DISABLE ROW LEVEL SECURITY;
ALTER TABLE dreams DISABLE ROW LEVEL SECURITY;
ALTER TABLE gallery DISABLE ROW LEVEL SECURITY;
ALTER TABLE important_dates DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STORAGE BUCKET CONFIGURATION
-- ============================================================================

-- Create the public bucket 'love-hunt-media' if it does not exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('love-hunt-media', 'love-hunt-media', true) 
ON CONFLICT (id) DO NOTHING;

-- Drop policy if it exists to avoid duplication errors
DROP POLICY IF EXISTS "Public Upload and Access Policy" ON storage.objects;

-- Create policy to allow all operations (SELECT, INSERT, UPDATE, DELETE) for anyone on the bucket
CREATE POLICY "Public Upload and Access Policy" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'love-hunt-media') 
WITH CHECK (bucket_id = 'love-hunt-media');
