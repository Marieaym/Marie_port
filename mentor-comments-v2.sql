-- Mentor's Desk v2: richer feedback workflow.
-- Run after the original mentor_comments table exists.
-- Replace the two emails before running.

alter table public.mentor_comments
  add column if not exists feedback_type text not null default 'Thought',
  add column if not exists status text not null default 'new',
  add column if not exists reply text,
  add column if not exists replied_at timestamptz;

alter table public.mentor_comments enable row level security;

revoke all on public.mentor_comments from anon;
grant select, insert, update on public.mentor_comments to authenticated;

drop policy if exists "Approved reviewers can read" on public.mentor_comments;
drop policy if exists "Approved reviewers can insert" on public.mentor_comments;
drop policy if exists "Approved reviewers can update" on public.mentor_comments;
drop policy if exists "approved reviewers can read" on public.mentor_comments;
drop policy if exists "approved reviewers can insert" on public.mentor_comments;

create policy "Approved reviewers can read"
on public.mentor_comments
for select
using (
  lower(auth.jwt() ->> 'email') in (
    lower('abdouyahayamarie006@gmail.com'),
    lower('hello@samiradiallo.com')
  )
);

create policy "Approved reviewers can insert"
on public.mentor_comments
for insert
with check (
  lower(auth.jwt() ->> 'email') in (
    lower('abdouyahayamarie006@gmail.com'),
    lower('hello@samiradiallo.com')
  )
  and lower(author_email) = lower(auth.jwt() ->> 'email')
);

create policy "Approved reviewers can update"
on public.mentor_comments
for update
using (
  lower(auth.jwt() ->> 'email') = lower('abdouyahayamarie006@gmail.com')
)
with check (
  lower(auth.jwt() ->> 'email') = lower('abdouyahayamarie006@gmail.com')
);
