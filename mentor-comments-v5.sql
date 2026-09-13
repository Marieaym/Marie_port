-- Mentor's Desk v5: let the mentor see, edit and delete her own notes, all without an account.
-- This file is fully self contained. You do not need to have run any earlier mentor-comments
-- file first, this one brings the table up to date on its own, safely, even if run more than once.

-- 1) Find every REPLACE_WITH_YOUR_ACCESS_WORD below and replace it with the same word, then
-- run this whole script in the Supabase SQL Editor. Give that exact word to your mentor
-- directly (text message, call, in person), never by email.

create table if not exists public.mentor_comments (
  id uuid primary key default gen_random_uuid(),
  author_name text not null,
  author_email text,
  section_key text not null,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.mentor_comments
  add column if not exists feedback_type text not null default 'thought',
  add column if not exists status text not null default 'new',
  add column if not exists reply text,
  add column if not exists replied_at timestamptz,
  add column if not exists updated_at timestamptz,
  add column if not exists access_code text;

alter table public.mentor_comments
  alter column author_email drop not null;

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

-- 2) Anonymous visitors (the mentor form) can insert, and can select, update or delete only
-- the rows that carry the matching access word. Editing is limited to the note's type and
-- content; the status, the reply and the access word itself can never be changed from here.
revoke all on public.mentor_comments from anon;
grant insert on public.mentor_comments to anon;
grant select on public.mentor_comments to anon;
grant update (feedback_type, content, updated_at) on public.mentor_comments to anon;
grant delete on public.mentor_comments to anon;
grant select, insert, update, delete on public.mentor_comments to authenticated;

drop policy if exists "Approved reviewers can read" on public.mentor_comments;
drop policy if exists "Approved reviewers can insert" on public.mentor_comments;
drop policy if exists "Approved reviewers can update" on public.mentor_comments;
drop policy if exists "Approved reviewers can delete" on public.mentor_comments;
drop policy if exists "Mentor can submit with the access word" on public.mentor_comments;
drop policy if exists "Mentor can view notes with the access word" on public.mentor_comments;
drop policy if exists "Mentor can edit own note content" on public.mentor_comments;
drop policy if exists "Mentor can delete own note" on public.mentor_comments;
drop policy if exists "Marie can read" on public.mentor_comments;
drop policy if exists "Marie can update" on public.mentor_comments;
drop policy if exists "Marie can delete" on public.mentor_comments;

-- 3) Marie, unchanged: full read, reply, edit and delete on everything.
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

-- 4) The mentor, identified only by the access word. Insert always works. Select shows every
-- row that carries the word, so she sees her own history and Marie's replies. Update and
-- delete only work while the note is still "new", so a note Marie has already replied to is
-- locked from her side, protecting Marie's reply from being edited away.
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

create policy "Mentor can view notes with the access word"
on public.mentor_comments
for select
to anon
using (access_code = 'REPLACE_WITH_YOUR_ACCESS_WORD');

create policy "Mentor can edit own note content"
on public.mentor_comments
for update
to anon
using (access_code = 'REPLACE_WITH_YOUR_ACCESS_WORD' and status = 'new')
with check (
  access_code = 'REPLACE_WITH_YOUR_ACCESS_WORD'
  and status = 'new'
  and reply is null
  and feedback_type in ('thought','suggestion','question')
  and char_length(coalesce(content, '')) between 1 and 5000
);

create policy "Mentor can delete own note"
on public.mentor_comments
for delete
to anon
using (access_code = 'REPLACE_WITH_YOUR_ACCESS_WORD' and status = 'new');
