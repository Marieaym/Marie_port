# Mentor's Desk, setup & usage

## Supabase
1. Keep your existing `mentor_comments` table.
2. Run `mentor-comments-v4.sql` in Supabase SQL Editor. Before running it, replace
   `REPLACE_WITH_YOUR_ACCESS_WORD` with the word or short phrase you want Samira to use.
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
- she chooses a section;
- she chooses Thought / Suggestion / Question;
- she writes feedback and sends it straight to Marie.

She can no longer see her own past notes on that page. This is intentional: without an account
there is no safe way to show her only her own history, so the page stays a simple, one way
submission form.

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
  traffic. It stops random visitors from filling your inbox with junk; it does not protect
  sensitive information, so do not use it for anything beyond mentor feedback.
- The database is the real security boundary, not the page. Anonymous visitors can only insert
  a new row; they can never read, edit or delete existing feedback, even if they open the browser
  console. Only Marie's authenticated session can read, reply, edit or delete.
- If you ever suspect the access word has leaked, change it: edit the value in
  `mentor-comments-v4.sql` and rerun that one policy in the Supabase SQL Editor, then give Samira
  the new word directly.
