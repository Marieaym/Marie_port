# Mentor's Desk — setup & usage

## Supabase
1. Keep your existing `mentor_comments` table.
2. Run `mentor-comments-v2.sql` in Supabase SQL Editor.
3. Make sure Email / Magic Link authentication is enabled.
4. In Authentication > URL Configuration, add your Vercel site URL and `/mentor-review.html` as a redirect URL.

## Site configuration
Copy your real values into `review-config.js`:

- `supabaseUrl`: Project URL
- `supabaseAnonKey`: Supabase Publishable key (or legacy public anon key)
- `ownerEmail`: Marie's approved email

Never place a `sb_secret_*` or `service_role` key in the browser.

## Samira
She uses `mentor-review.html`:
- enters her email;
- clicks the magic link;
- chooses a section;
- chooses Thought / Suggestion / Question;
- writes feedback;
- sees her own previous notes.

## Marie
Marie uses `marie-inbox.html`:
- signs in with the approved Marie email;
- sees all approved feedback;
- filters New / In progress / Addressed;
- replies to a note;
- marks a note as addressed.

## Important
This is a frontend + Supabase setup. The authorization is enforced in Supabase with Row Level Security; the UI alone is not the security boundary.
