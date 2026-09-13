-- Mentor's Desk v4: remove the mentor's login step.
-- Samira no longer signs in with Supabase Auth. She submits feedback directly from
-- mentor-review.html, protected by a shared access word checked here in the database.
-- Marie's access (Marie's Inbox) is unchanged: she still signs in with her approved email.

-- 1) The table no longer needs an email per note, and needs a place to check the access word.
alter table public.mentor_comments
  alter column author_email drop not null;

alter table public.mentor_comments
  add column if not exists access_code text;

alter table public.mentor_comments enable row level security;

-- 2) Anonymous visitors (the mentor form) may only INSERT. They can never read, edit or delete.
revoke all on public.mentor_comments from anon;
grant insert on public.mentor_comments to anon;
grant select, insert, update, delete on public.mentor_comments to authenticated;

drop policy if exists "Approved reviewers can read" on public.mentor_comments;
drop policy if exists "Approved reviewers can insert" on public.mentor_comments;
drop policy if exists "Approved reviewers can update" on public.mentor_comments;
drop policy if exists "Approved reviewers can delete" on public.mentor_comments;
drop policy if exists "Mentor can submit with the access word" on public.mentor_comments;
drop policy if exists "Marie can read" on public.mentor_comments;
drop policy if exists "Marie can update" on public.mentor_comments;
drop policy if exists "Marie can delete" on public.mentor_comments;

-- 3) Marie only, now that Samira no longer authenticates.
create policy "Marie can read"
on public.mentor_comments
for select
to authenticated
using (lower(auth.jwt() ->> 'email') = lower('abdouyahayamarie006@gmail.com'));

create policy "Marie can update"
on public.mentor_comments
for update
to authenticated
using (lower(auth.jwt() ->> 'email') = lower('abdouyahayamarie006@gmail.com'))
with check (lower(auth.jwt() ->> 'email') = lower('abdouyahayamarie006@gmail.com'));

create policy "Marie can delete"
on public.mentor_comments
for delete
to authenticated
using (lower(auth.jwt() ->> 'email') = lower('abdouyahayamarie006@gmail.com'));

-- 4) Replace REPLACE_WITH_YOUR_ACCESS_WORD below with your own word or short phrase before
-- running this script. Give that exact word to Samira directly (text message, call, in person),
-- never by email, and never post it anywhere public. If you ever want to change it, edit the
-- value here and rerun just this policy in the Supabase SQL Editor.
create policy "Mentor can submit with the access word"
on public.mentor_comments
for insert
to anon
with check (
  access_code = 'REPLACE_WITH_YOUR_ACCESS_WORD'
  and status = 'new'
  and reply is null
  and replied_at is null
  and feedback_type in ('thought','suggestion','question')
  and char_length(coalesce(author_name, '')) between 1 and 200
  and char_length(coalesce(content, '')) between 1 and 5000
);
