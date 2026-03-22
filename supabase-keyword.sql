-- Run this in Supabase SQL Editor

-- Add keyword column to parties table (if not already there)
ALTER TABLE parties ADD COLUMN IF NOT EXISTS keyword TEXT;
ALTER TABLE parties ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';

-- Add signed_up_at to party_snowballers
ALTER TABLE party_snowballers ADD COLUMN IF NOT EXISTS signed_up_at TIMESTAMPTZ;

-- Index for fast keyword lookup
CREATE INDEX IF NOT EXISTS parties_keyword_idx ON parties(keyword);

-- Update any existing parties that have keyword in stops_data
UPDATE parties SET keyword = stops_data->>'keyword'
WHERE keyword IS NULL AND stops_data->>'keyword' IS NOT NULL;
