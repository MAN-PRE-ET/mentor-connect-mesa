-- Schema taken verbatim from the user's seed_mentors.sql (data rows are applied separately from the same file).
create table if not exists public.mentors (
  id text primary key,
  name text not null,
  city text,
  domains text[] not null default '{}',
  company text,
  master_sector text,
  sectors text[] not null default '{}',
  roles text[] not null default '{}',
  seniority text,
  ai_native boolean,
  built_ai_product boolean,
  ai_experience boolean,
  ai_sub_domain text,
  ai_tools text[] not null default '{}',
  analytics_tools text[] not null default '{}',
  quality_of_mentorship text,
  activities_participated int,
  data_completeness text not null default 'low'
);
alter table public.mentors enable row level security;
drop policy if exists "mentors are readable" on public.mentors;
create policy "mentors are readable" on public.mentors for select using (true);
-- Required so the app's Data API can read the table (the seed file does not include grants).
grant select on public.mentors to anon, authenticated;
grant all on public.mentors to service_role;
