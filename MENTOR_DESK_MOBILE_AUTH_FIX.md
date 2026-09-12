# Mentor's Desk v24 — mobile magic-link fix

This version fixes the Mentor's Desk browser authentication flow for a static site using Supabase magic links.

## Changes
- Uses Supabase `implicit` auth flow for browser magic links instead of PKCE.
- Removes manual `exchangeCodeForSession()` handling, avoiding double-processing of the callback.
- Uses a stable redirect URL: `/mentor-review.html` on the current site origin.
- Waits for the auth state/session to be available before showing the workspace.
- Prevents duplicate initialization caused by multiple Supabase auth events.
- Cache-busts the Mentor's Desk scripts to `v24`.

## Supabase redirect URL
In Supabase Authentication > URL Configuration, add the exact deployed URL:

https://YOUR-DOMAIN/mentor-review.html

Also keep the site URL configured to the deployed portfolio origin.

## Important mobile behavior
The magic link must be opened in the browser that will be used for Mentor's Desk. A session is stored per browser/app context; opening the link inside an email app's embedded browser and then switching to a different browser can result in a new login prompt.

Never put a `service_role` or `sb_secret_*` key in `review-config.js`.
