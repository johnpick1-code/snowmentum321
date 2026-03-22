-- Add keyword column to parties if not exists
ALTER TABLE parties ADD COLUMN IF NOT EXISTS keyword TEXT;

-- Add signed_up_at to party_snowballers if not exists  
ALTER TABLE party_snowballers ADD COLUMN IF NOT EXISTS signed_up_at TIMESTAMPTZ;
ALTER TABLE party_snowballers ADD COLUMN IF NOT EXISTS passport_id UUID REFERENCES passports(id);

-- Index for fast keyword lookup
CREATE INDEX IF NOT EXISTS idx_parties_keyword ON parties(keyword);

-- Allow public read on parties (for join page) — read only by keyword
-- Run this in Supabase SQL editor if RLS is enabled:
-- CREATE POLICY "Public can read parties by keyword" ON parties FOR SELECT USING (true);
-- CREATE POLICY "Public can insert snowballers" ON snowballers FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Public can insert party_snowballers" ON party_snowballers FOR INSERT WITH CHECK (true);
