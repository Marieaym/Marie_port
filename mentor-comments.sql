-- Mentor's Desk — Supabase setup
-- 1. Create a Supabase project.
-- 2. Enable Authentication > Email (magic link).
-- 3. Replace the two placeholder emails below with Marie's and Samira's real email addresses.
-- 4. Run this script in Supabase SQL Editor.

create table if not exists public.mentor_comments (
  id uuid primary key default gen_random_uuid(),
  author_name text not null,
  author_email text not null,
  section_key text not null,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.mentor_comments enable row level security;

drop policy if exists "approved reviewers can read" on public.mentor_comments;
drop policy if exists "approved reviewers can insert" on public.mentor_comments;

create policy "approved reviewers can read"
on public.mentor_comments for select
using (
  lower(auth.jwt() ->> 'email') in (
    lower('MARIE_EMAIL_HERE'),
    lower('SAMIRA_EMAIL_HERE')
  )
);

create policy "approved reviewers can insert"
on public.mentor_comments for insert
with check (
  lower(auth.jwt() ->> 'email') in (
    lower('MARIE_EMAIL_HERE'),
    lower('SAMIRA_EMAIL_HERE')
  )
  and lower(author_email) = lower(auth.jwt() ->> 'email')
);
