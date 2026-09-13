# Mentor's Desk, setup & usage

## Supabase
1. Keep your existing `mentor_comments` table.
2. Run `mentor-comments-v5.sql` in Supabase SQL Editor. It is self contained, you do not need
   to run v4 first. Before running it, replace every `REPLACE_WITH_YOUR_ACCESS_WORD` with the
   same word or short phrase, the one you will give to Samira.
3. Marie's login still needs Email / Magic Link authentication enabled for `marie-inbox.html`.
   Samira no longer signs in, so nothing to set up on her side beyond the access word.

## Site configuration
Copy your real values into `review-config.js`:

- `supabaseUrl`: Project URL
- `supabaseAnonKey`: Supabase Publishable key (or legacy public anon key)
- `ownerEmail`: Marie's approved email

Never place a `sb_secret_*` or `service_role` key in the browser.

## Samira
She uses `mentor-review.html`, no account and no email needed:
- the first time on a device, she types the access word Marie gave her directly;
- the browser remembers it after that, so she will not be asked again on that device;
- she chooses a section, chooses Thought / Suggestion / Question, writes her note and sends it;
- her own notes appear below the form in a light, card based layout, filterable by type;
- while a note is still new, she can edit or delete it herself;
- once Marie has replied to a note, that note is locked on Samira's side, so her reply cannot
  be edited away by mistake. Samira can still read the note and Marie's reply, just not change it.

## Marie
Marie uses `marie-inbox.html`, unchanged:
- signs in with the approved Marie email;
- sees all approved feedback;
- filters New / In progress / Addressed;
- replies to a note;
- marks a note as addressed.

## Important, read before you rely on this
- The access word is a light deterrent against casual visitors and spam, not a strong secret.
  Because this is a static site with no backend, the word is sent from the browser to Supabase
  in plain text, and a technically determined person could find it by reading the page's network
  traffic.
- Since v5, knowing the word gives more than the ability to insert a note: it also lets you read,
  edit and delete every note that carries that word, until Marie replies to it. This is a step up
  from v4, where a leaked word could only be used to insert spam. Only ever share the word with
  Samira, the same way you would share it before, by text, call or in person, never by email and
  never on a public page.
- The database is the real security boundary, not the page. Anonymous visitors can only touch
  rows that carry the exact access word; they can never read, edit or delete Marie's side of
  things, even if they open the browser console. Only Marie's authenticated session can reply,
  edit or delete without that restriction.
- If you ever suspect the access word has leaked, change it: edit every occurrence of it in
  `mentor-comments-v5.sql` and rerun the whole script in the Supabase SQL Editor, then give
  Samira the new word directly. Her older notes, stored under the old word, will no longer be
  reachable from the mentor page after that, only from Marie's Inbox.
