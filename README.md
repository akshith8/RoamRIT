# RoamRIT

RoamRIT is a campus companion site for MSRIT students to discover, review, and talk about spots around campus — study corners, food joints, chill-out areas, and hangout spots. It's a static front-end (HTML/CSS/vanilla JS) backed by Supabase for auth, data storage, and a lightweight gamification system.
We are live: https://roamrit.netlify.app

## Features

- **Explore** — browse campus spots as a list or on an interactive campus map, filter by category (Study, Food, Chill, Hangout), and search by name, vibe, or amenities.
- **Interactive campus map** — buildings are drawn as tappable hotspots over a campus image; tapping a building surfaces the spots inside it. Includes zoom/pan controls.
- **Spot details** — a slide-out drawer shows ratings and recent check-ins (vibe, noise, outlet access, comfort) for a spot.
- **Add a spot / Review a spot** — logged-in users can add new spots (name, category, sector, map pin, description) or leave a review of an existing one (star rating, vibe, noise/outlets/comfort sliders, optional note).
- **Community board** — a shared feed where logged-in users can post short messages tied to a specific spot; everyone (including logged-out visitors) can read it.
- **Saved spots** — bookmark spots to a personal shortlist.
- **Recent activity feed** — a live-ish stream of the newest check-ins across campus.
- **Leaderboard & points** — users earn points for contributing: +20 for adding a spot, +10 for a review, +5 for a community post. Points are protected server-side so they can't be tampered with from the client.
- **Auth** — email/password login and sign-up, gating the app shell behind a session check.

## Tech stack

- **Frontend**: plain HTML, CSS, and vanilla JavaScript (no build step, no framework). Fonts via Google Fonts (DM Sans, Space Grotesk, IBM Plex Mono).
- **Backend**: [Supabase](https://supabase.com) — Postgres database, Auth, and auto-generated REST API, accessed via the `@supabase/supabase-js` client loaded from a CDN.
- **Hosting**: configured for [Netlify](https://netlify.com) (see `netlify.toml`), but any static host works since there's no build step.

## Project structure

```
RoamRIT/
├── index.html              # Main app shell (Explore, Saved, Community, Leaderboard, Add/Review views)
├── login.html               # Standalone log in / sign up page
├── css/
│   └── style.css            # All styling
├── js/
│   ├── config.js             # Shared App namespace, icons, categories, small helpers
│   ├── supabase-config.js    # Supabase project URL + anon key (fill in your own)
│   ├── supabase-client.js    # Initializes the Supabase client
│   ├── campus-data.js        # Static campus building layout for the map
│   ├── campus-map.js         # Map rendering, zoom/pan, building hit-testing
│   ├── state.js               # Client-side app state
│   ├── explore.js             # Explore view: list/map toggle, search, filters
│   ├── detail-drawer.js       # Spot detail slide-out drawer
│   ├── contribute-form.js     # Add Spot / Review Spot forms
│   ├── community.js           # Community board feed + composer
│   ├── auth.js                # Session bootstrap, login gating, auth pill in the topbar
│   ├── nav.js                 # View routing / navigation
│   └── main.js                # App bootstrap
├── assets/
│   └── campus-map.jpg         # Illustrated campus map image used by the map view
├── sql/
│   └── schema.sql             # Full Supabase/Postgres schema, RLS policies, triggers
└── netlify.toml               # Netlify build/publish + security headers config
```

## Data model (Supabase)

Defined in `sql/schema.sql`:

- **`spots`** — the places on the map (name, category, sector, map coordinates, rating, description, owning user).
- **`checkins`** — reviews/check-ins attached to a spot (vibe, noise, outlets, comfort, note).
- **`profiles`** — one row per account (display name, running points total), auto-created on sign-up via a trigger on `auth.users`.
- **`posts`** — community board messages, tied to a user and a spot.

Row Level Security is enabled on every table:
- Everyone (including anonymous visitors) can **read** all data.
- Only **logged-in users** can add spots, post check-ins, or post to the community board, and only as themselves (`auth.uid() = user_id`).
- A trigger + `award_points()` function grant points automatically on insert; a separate trigger blocks any direct client-side write to a profile's `points` column, so the only way to gain points is by actually contributing.

## Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com).
2. **Run the schema** — open the SQL Editor in your Supabase project, paste the contents of `sql/schema.sql`, and run it.
3. **Add your credentials** — open `js/supabase-config.js` and fill in:
   ```js
   window.SUPABASE_URL = "https://YOUR-PROJECT-ref.supabase.co";
   window.SUPABASE_ANON_KEY = "YOUR-ANON-KEY";
   ```
   Both values come from Project Settings → API in Supabase. The anon key is safe to ship client-side — access is controlled entirely by the RLS policies above. **Never** put the `service_role` key here.
4. **Serve the site** — since there's no build step, any static file server works locally, e.g.:
   ```bash
   npx serve .
   ```
   or just open `index.html` directly in a browser (some browser security settings may require a local server instead of `file://`).
5. **Deploy** — the included `netlify.toml` publishes the project root and sets a couple of security headers; connect the repo to Netlify (or drag-and-drop the folder) to deploy as-is. Any static host (Vercel, GitHub Pages, etc.) will also work.

## Notes

- The campus map building positions in `js/campus-data.js` are measured as percentages against `assets/campus-map.jpg` (876×552px) — if you swap in a different map image, you'll need to re-measure the building coordinates.
- The map/campus layout in this repo is built around the MSRIT campus.
