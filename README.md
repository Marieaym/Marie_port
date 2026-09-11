Marie Yahaya — Personal Portfolio

This is a static website. Open index.html from the root folder, or deploy the folder directly to Vercel/GitHub Pages.

Main sections:
Home · About Me · Projects · Experience · Activities · Visual Diary · My Take · Journal · Contact

V13 fixes:
- simplified root structure
- resilient local-file storage handling
- non-blocking scripts
- protected animation fallback
- activity pages contain no activity photos


V14 FIX: removed the global MutationObserver feedback loop that could freeze navigation and stop the page mid-render.

V15 CONTENT ARCHITECTURE:
- Credentials = certificates, diplomas, courses and formal evidence only.
- Visual Diary = personal and activity photography only; credentials are not duplicated here.
- Mentor's Desk = private review layer prepared for Supabase magic-link authentication and RLS.
- JOURNAL_GUIDE.md explains how to add new Journal articles in the current static workflow.
- mentor-comments.sql contains the Supabase table and security policies for the review archive.


## Site map
- Home: introduction and highlights
- About Me: identity, values, growth and vision
- Projects: technical work and case studies
- Experience / Activities: professional, leadership, global, competition, service and research chapters
- Credentials: diplomas, certificates, courses and formal evidence
- Visual Diary: photography only
- My Take: questions and personal viewpoints
- Journal: long-form writing and reflections
- Mentor's Desk: private mentor feedback

## Mobile navigation fix
The mobile menu is handled only by `global.js`. A duplicate handler previously existed in `script.js`, causing the menu to open and close immediately on some devices. The final mobile CSS makes the menu a fixed drawer below the sticky navigation.
