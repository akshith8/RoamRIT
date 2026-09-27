# RoamRIT
A student-driven platform to discover and rate cafés, food spots, hangouts, and useful places around MSRIT.

## Project structure
```
roamrit/
├── index.html            the app (Explore, Saved, Community, Leaderboard, Add/Review Spot)
├── login.html             standalone login/sign-up page
├── netlify.toml
├── .gitignore
├── css/
│   └── style.css
├── js/
│   ├── supabase-config.js   ← put your Project URL + anon key here
│   ├── config.js             static data: icons, categories, filters, tiny helpers
│   ├── supabase-client.js    Supabase client + DB-row → app-object mappers
│   ├── campus-data.js        campus building layout + lookups
│   ├── state.js              shared app state (spots, session, forms, saved list, points)
│   ├── campus-map.js         the big Explore-tab map: zoom/pan, sector filter, markers
│   ├── explore.js            search/filter, place cards, list/map toggle, feed, Saved tab
│   ├── detail-drawer.js       the slide-in spot detail panel
│   ├── contribute-form.js    Add Spot / Review Spot form + mini pin-picker
│   ├── community.js          community board + leaderboard
│   ├── auth.js                topbar auth pill + session-gate bootstrap
│   ├── nav.js                 tab switching, toasts, initial render
│   ├── main.js                entry point — loaded last, kicks off data load
│   └── login.js               logic for login.html only
├── assets/
│   └── campus-map.jpg
└── sql/
    └── schema.sql
```
All of the `js/*.js` files load as plain `<script>` tags (in the order listed above) and share a single `window.App` namespace object — there's no build step, so this stays a drop-in static site for Netlify. If you add a new file, load it after `state.js` and before `main.js`.

## Campus map uses the real illustrated map
The Map view (and the mini pin-picker in **Add Spot**) render the illustrated isometric campus artwork (`assets/campus-map.jpg`) as their background instead of flat colored blocks. The building tap-zones, tooltips, "Filling/Busy" dots, and the sector filter pill all still work — they're invisible hit-boxes positioned in `js/campus-data.js`'s `CAMPUS_BUILDINGS` array to line up pixel-for-pixel with the artwork. On hover/tap, a building briefly lights up with a soft color tint over the art.

If you ever swap in a new map image:
1. Replace `assets/campus-map.jpg` (any aspect ratio works, but keep it wide-landscape — the map canvas locks to the image's own ratio via CSS `aspect-ratio` so nothing stretches).
2. Re-measure each building's bounding box as a % of the new image's width/height and update the `x`, `y`, `w`, `h` values in `CAMPUS_BUILDINGS` in `js/campus-data.js`.

The whole app sits behind a login: opening the site sends you to **`login.html`** first; once logged in you land on **`index.html`**, and RoamRIT remembers you on that device until you log out. Both pages run on the same Supabase project.

## Points & leaderboard
Every logged-in user has a running point total, visible next to their name in the topbar, on the community board, and on the **Leaderboard** tab.

- **+20** for adding a new spot
- **+10** for posting a review/check-in on an existing spot
- **+5** for posting to the community board

Points are awarded entirely in the database (`sql/schema.sql` adds a `points` column on `profiles` plus a trigger on each of `spots`, `checkins`, and `posts` that credits the author on insert) — not by the frontend — so the total can't drift out of sync and can't be gamed by editing the JS. A guard trigger also blocks the existing "update own profile" policy from being used to edit `points` directly from the client; only the internal award triggers can change it.

## Community posts are tied to a spot
Before posting on the Community board, you choose which spot the post is about from a dropdown in the composer (the **Post** button stays disabled until both a spot and some text are filled in). Each post shows a small "📍 Spot name" tag underneath it — tap it to jump straight to that spot's details.

## How the login gate works
- `login.html` is its own page with its own script (`js/login.js`) — a login/sign-up form, nothing else.
- `index.html` is the app itself. On load it checks for a Supabase session before showing anything: a small loading screen holds while that check runs, then either the app appears or the browser is sent to `login.html`.
- The Supabase JS client persists sessions in the browser by default, so closing the tab and coming back (or restarting the browser) keeps you logged in until the session expires or you log out.
- The **Log out** button (in the user pill, top right) signs out and sends you back to `login.html`.
- If Supabase isn't configured yet (`js/supabase-config.js` still has placeholder values), both pages skip the redirect and show a "Supabase isn't configured" message instead of looping.

## Setup

### 1. Create a Supabase project
Go to [supabase.com](https://supabase.com) → New project. Wait for it to finish provisioning.

### 2. Run the database schema
Open **SQL Editor** in the Supabase dashboard → New query → paste in the entire contents of `sql/schema.sql` from this repo → **Run**.

This creates four tables:
- `spots` — the places on the map (open to everyone to read and add to)
- `checkins` — reviews/check-ins on a spot
- `profiles` — one row per account, auto-created on sign-up (via a trigger)
- `posts` — the community board; anyone can read, only logged-in users can post, only the author can delete their own post

### 3. Connect the app to your project
In the Supabase dashboard go to **Project Settings → API** and copy:
- **Project URL**
- **anon / public** key (never the `service_role` key)

Paste them into `js/supabase-config.js` (shared by both `index.html` and `login.html`):
```js
window.SUPABASE_URL = "https://YOUR-PROJECT-ref.supabase.co";
window.SUPABASE_ANON_KEY = "YOUR-ANON-KEY";
```

### 4. Turn on email sign-up
Email/password auth is on by default in Supabase. Two settings worth checking under **Authentication → Providers → Email**:
- **Confirm email** — ON means new users get a confirmation email before they can log in. Turn it OFF while testing locally so sign-up logs you in immediately.
- **Site URL** and **Redirect URLs** under **Authentication → URL Configuration** — set these to wherever you deploy so confirmation links point to the right place.

### 5. Deploy
This is a static site — `netlify.toml` is set up with `publish = "."`. Push the folder to a Git repo and connect it in Netlify, or drag-and-drop the folder into Netlify's dashboard. Folder structure changes (css/, js/, assets/, sql/) don't need any Netlify config changes — the paths in `index.html` and `login.html` already point at the right places.

### 6. Try it
- Open the site → you're sent to `login.html`. **Sign up** with an email, password, and display name.
- You land on the app (Explore tab). Your display name and avatar (top right) come from sign-up.
- Visit **Community** and post — the same identity shows up there.
- Reload, close the tab and reopen it, or restart the browser: you should stay logged in.
- **Log out** (top right) → back to `login.html`. Visiting `index.html` directly while logged out also redirects there.
- Adding a spot and posting a review work the same as before — open to everyone once you're in.

## Backend check (this pass)
Every Supabase call in the JS was checked against `sql/schema.sql` column-for-column and policy-for-policy while splitting the code apart:
- `checkins`/`spots`/`posts` insert payloads match their table columns and RLS `insert` checks exactly.
- The `posts` select (`*, profiles(display_name, points), spots(name)`) relies on the `posts.user_id → profiles.id` and `posts.spot_id → spots.id` foreign keys, both present in the schema, so the embedded joins resolve.
- The points-award triggers run inside the same transaction as the insert they're attached to, and `protect_points()` correctly blocks a client from writing `points` directly through the "update own profile" policy.
No schema or policy changes were needed — the backend logic was already consistent with the frontend. (This is a static review of the SQL/JS against each other; it isn't a substitute for clicking through the app once against a live Supabase project, since this environment can't reach the network to do that for you.)

## Security fix — locking down `spots` and `checkins` writes
Earlier versions of `sql/schema.sql` let **anyone** — including a request made directly against the Supabase REST API with nothing but the public anon key, not just people using the app — insert new spots, post checkins, or rewrite any column on any existing spot (its name, location, description, not just its rating). The anon key itself was never the problem (it's meant to be public), but those policies were too permissive.

This is now fixed: adding a spot or posting a checkin requires a logged-in session and can only be attributed to yourself (`auth.uid() = user_id`), and updating a spot is restricted — both by policy and at the database grant level — to just the `rating` column. Since the whole app already requires login before you can reach the Explore tab, this doesn't change anything about how RoamRIT feels to use.

**If you already ran the old `schema.sql` on a live Supabase project**, open **SQL Editor → New query**, paste in just the new `-- Security hardening` section at the bottom of `sql/schema.sql`, and run it — every statement in it is idempotent (safe to run more than once, and safe to run without the rest of the file).

### Notes
- The anon key is safe to expose in client-side code — everything it can and can't do is controlled by the Row Level Security policies in `sql/schema.sql`.
- Display names are editable data-wise (in `profiles.display_name`), but there's no in-app "edit profile" UI yet.
- Posts are limited to 500 characters at the database level (`posts.body` check constraint) as well as in the textarea.
- Want spots/check-ins to also carry an author-only edit/delete policy? Swap their `insert`/`update` policies in `sql/schema.sql` to use `auth.uid() = ...` the same way `posts` does.
- "Remember me" is effectively always on, for as long as the Supabase session/refresh token stays valid (a few weeks by default) — controlled by the `persistSession`/`autoRefreshToken` options passed to `createClient`, left at their (persistent) defaults.

## What changed in this cleanup pass
- Removed the scrolling "ticker" marquee strip from the Explore tab (and its CSS/JS) — it was decorative and repeated real check-in data that's already shown elsewhere (the pulse strip, the Feed tab). The live "N of M spots open" pulse strip itself was kept since it's real, not dummy, data.
- No dummy/placeholder stats were found elsewhere in the app — the app was already loading everything from Supabase with no hardcoded seed content.
- Split the single ~1,070-line `script.js` into 13 small, functionally-scoped files under `js/` (see the structure above) sharing one `App` namespace, and moved CSS/images/SQL into their own folders.
- Ambient background blobs, the spinning dot next to the hero heading, and other visual flourishes were intentionally left as-is per request.
