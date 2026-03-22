-- Run this in Supabase → SQL Editor → New Query

-- Parties table
create table if not exists parties (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  city text,
  start_time text,
  party_size integer default 16,
  stops_data jsonb,
  created_at timestamptz default now()
);

-- Snowballers table (persistent profiles)
create table if not exists snowballers (
  id uuid default gen_random_uuid() primary key,
  name text,
  phone text unique,
  first_seen timestamptz default now(),
  last_seen timestamptz default now(),
  parties_count integer default 1
);

-- Party snowballers join table
create table if not exists party_snowballers (
  id uuid default gen_random_uuid() primary key,
  party_id uuid references parties(id) on delete cascade,
  snowballer_id uuid references snowballers(id) on delete cascade,
  stop_key text,
  checked_in boolean default false,
  created_at timestamptz default now()
);

-- Enable Row Level Security (open for service role)
alter table parties enable row level security;
alter table snowballers enable row level security;
alter table party_snowballers enable row level security;

-- Allow service role full access
create policy "Service role full access" on parties for all using (true);
create policy "Service role full access" on snowballers for all using (true);
create policy "Service role full access" on party_snowballers for all using (true);
