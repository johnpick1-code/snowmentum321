-- Run this in Supabase SQL Editor to fix all missing columns
ALTER TABLE parties ADD COLUMN IF NOT EXISTS keyword text;
ALTER TABLE parties ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft';
ALTER TABLE parties ADD COLUMN IF NOT EXISTS stops_data text;
ALTER TABLE parties ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE parties ADD COLUMN IF NOT EXISTS flyer_url text;

-- Fix stops_data type if needed (convert jsonb to text)
-- If stops_data is already jsonb, cast it:
-- ALTER TABLE parties ALTER COLUMN stops_data TYPE text USING stops_data::text;

-- Add email to snowballers
ALTER TABLE snowballers ADD COLUMN IF NOT EXISTS email text;

-- Mega events table
CREATE TABLE IF NOT EXISTS mega_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  keyword text UNIQUE NOT NULL,
  bracket_ids uuid[] DEFAULT '{}',
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

-- Snowbank contributions table
CREATE TABLE IF NOT EXISTS snowbank_contributions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  party_id uuid REFERENCES parties(id),
  snowballer_name text,
  amount numeric(10,2),
  stop_key text,
  platform text DEFAULT 'venmo',
  created_at timestamptz DEFAULT now()
);

-- Mega events table
CREATE TABLE IF NOT EXISTS mega_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  keyword text NOT NULL UNIQUE,
  party_ids text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
