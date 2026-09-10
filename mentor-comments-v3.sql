-- Mentor's Desk v3: allow feedback authors to edit/delete their own notes.
-- Owner (Marie) keeps full edit/delete access for the inbox.

alter table public.mentor_comments
  add column if not exists updated_at timestamptz;

alter table public.mentor_comments
  alter column feedback_type set default 'thought';

-- Normalize any legacy values created by older versions.
update public.mentor_comments
set feedback_type = lower(feedback_type)
where feedback_type is not null;

update public.mentor_comments
set feedback_type = 'thought'
where feedback_type is null
   or lower(feedback_type) not in ('thought','suggestion','question');

alter table public.mentor_comments
  drop constraint if exists mentor_comments_feedback_type_check;

alter table public.mentor_comments
  add constraint mentor_comments_feedback_type_check
  check (lower(feedback_type) in ('thought','suggestion','question'));

alter table public.mentor_comments
  drop constraint if exists mentor_comments_status_check;

alter table public.mentor_comments
  add constraint mentor_comments_status_check
  check (status in ('new','in progress','addressed'));

alter table public.mentor_comments enable row level security;
revoke all on public.mentor_comments from anon;
grant select, insert, update, delete on public.mentor_comments to authenticated;

-- Replace old policies cleanly.
drop policy if exists "Approved reviewers can read" on public.mentor_comments;
drop policy if exists "Approved reviewers can insert" on public.mentor_comments;
drop policy if exists "Approved reviewers can update" on public.mentor_comments;
drop policy if exists "Approved reviewers can delete" on public.mentor_comments;
drop policy if exists "Reviewer can update own feedback" on public.mentor_comments;
drop policy if exists "Reviewer can delete own feedback" on public.mentor_comments;

create policy "Approved reviewers can read"
on public.mentor_comments
for select
to authenticated
using (
  lower(auth.jwt() ->> 'email') in (
    lower('abdouyahayamarie006@gmail.com'),
    lower('hello@samiradiallo.com')
  )
);

create policy "Approved reviewers can insert"
on public.mentor_comments
for insert
to authenticated
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
to authenticated
using (
  lower(auth.jwt() ->> 'email') = lower('abdouyahayamarie006@gmail.com')
  or lower(author_email) = lower(auth.jwt() ->> 'email')
)
with check (
  lower(auth.jwt() ->> 'email') = lower('abdouyahayamarie006@gmail.com')
  or lower(author_email) = lower(auth.jwt() ->> 'email')
);

create policy "Approved reviewers can delete"
on public.mentor_comments
for delete
to authenticated
using (
  lower(auth.jwt() ->> 'email') = lower('abdouyahayamarie006@gmail.com')
  or lower(author_email) = lower(auth.jwt() ->> 'email')
);
