-- Passports table
create table if not exists passports (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  url text,
  sort_order integer default 0,
  active boolean default true
);

alter table passports enable row level security;
create policy "Service role full access" on passports for all using (true);
create policy "Public read active passports" on passports for select using (active = true);

-- Add passport fields to party_snowballers
alter table party_snowballers add column if not exists passport_id uuid references passports(id);
alter table party_snowballers add column if not exists passport_name text;
alter table party_snowballers add column if not exists passport_url text;

-- Seed all 63 passports
insert into passports (name, url, sort_order) values
('The Mayor','https://www.thesnowballparty.live/sb1',1),
('Cleaning Woman','https://www.thesnowballparty.live/sb2',2),
('A Fashionista','https://www.thesnowballparty.live/sb3',3),
('Aspiring Actor','https://www.thesnowballparty.live/sb4',4),
('Bookstore Owner','https://www.thesnowballparty.live/sb5',5),
('Casting Director','https://www.thesnowballparty.live/sb6',6),
('Cinematographer','https://www.thesnowballparty.live/sb7',7),
('Cleaning Person','https://www.thesnowballparty.live/sb8',8),
('Craft Services','https://www.thesnowballparty.live/sb9',9),
('Debra Messing','https://www.thesnowballparty.live/sb10',10),
('Doctor','https://www.thesnowballparty.live/sb11',11),
('Doctor B','https://www.thesnowballparty.live/sb12',12),
('Doctor C','https://www.thesnowballparty.live/sb13',13),
('Editor','https://www.thesnowballparty.live/sb14',14),
('Fashionista','https://www.thesnowballparty.live/sb15',15),
('Firefighter','https://www.thesnowballparty.live/sb17',16),
('Gangster','https://www.thesnowballparty.live/sb18',17),
('Gay Rights Leader','https://www.thesnowballparty.live/sb19',18),
('Hashtag','https://www.thesnowballparty.live/sb20',19),
('Head of Film Studio','https://www.thesnowballparty.live/sb21',20),
('Homeless Person','https://www.thesnowballparty.live/sb23',21),
('I Need to Chase You','https://www.thesnowballparty.live/sb24',22),
('Indian Settler','https://www.thesnowballparty.live/sb25',23),
('Indie Film Producer','https://www.thesnowballparty.live/sb26',24),
('Influencer','https://www.thesnowballparty.live/sb27',25),
('Journalist','https://www.thesnowballparty.live/sb28',26),
('Lifeguard','https://www.thesnowballparty.live/sb29',27),
('LinkedIn Job Interviewer','https://www.thesnowballparty.live/sb30',28),
('Liquor Store Owner','https://www.thesnowballparty.live/sb31',29),
('Love Doctor','https://www.thesnowballparty.live/sb32',30),
('Podcast Producer','https://www.thesnowballparty.live/sb33',31),
('Makeup Person','https://www.thesnowballparty.live/sb34',32),
('MBA Candidate','https://www.thesnowballparty.live/sb35',33),
('Music Promoter','https://www.thesnowballparty.live/sb36',34),
('Olympic Committee Mascot','https://www.thesnowballparty.live/sb37',35),
('Nurse','https://www.thesnowballparty.live/sb38',36),
('Owner of a Bird Store','https://www.thesnowballparty.live/sb39',37),
('Owner of a Plant Store','https://www.thesnowballparty.live/40',38),
('Police Officer','https://www.thesnowballparty.live/sb41',39),
('Porn Actor','https://www.thesnowballparty.live/sb42',40),
('Pro Basketball Player','https://www.thesnowballparty.live/sb43',41),
('Production Assistant','https://www.thesnowballparty.live/sb44',42),
('Production Designer','https://www.thesnowballparty.live/sb45',43),
('Radio Legend','https://www.thesnowballparty.live/sb46',44),
('Real Estate Agent (Commercial)','https://www.thesnowballparty.live/sb47',45),
('Real Estate Agent (Residential)','https://www.thesnowballparty.live/sb48',46),
('Runs Family Business','https://www.thesnowballparty.live/sb49',47),
('Stripper','https://www.thesnowballparty.live/sb50',48),
('Super Famous Actor','https://www.thesnowballparty.live/sb51',49),
('Surfer','https://www.thesnowballparty.live/sb52',50),
('Talent Agent','https://www.thesnowballparty.live/sb53',51),
('Teacher','https://www.thesnowballparty.live/sb54',52),
('The Reverend','https://www.thesnowballparty.live/sb56',53),
('The Sports Star','https://www.thesnowballparty.live/sb57',54),
('Therapist','https://www.thesnowballparty.live/sb58',55),
('Trust Fund Baby','https://www.thesnowballparty.live/sb58',56),
('TSA Agent','https://www.thesnowballparty.live/sb60',57),
('Utility Company Employee','https://www.thesnowballparty.live/sb61',58),
('VR Producer','https://www.thesnowballparty.live/sb62',59),
('Waiter','https://www.thesnowballparty.live/sb63',60),
('Bus Driver','https://www.thesnowballparty.live/sb64',61);
