
## Supabase SQL — run if columns missing
ALTER TABLE parties ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft';
ALTER TABLE parties ADD COLUMN IF NOT EXISTS stops_data text;
ALTER TABLE parties ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE parties ADD COLUMN IF NOT EXISTS keyword text;
