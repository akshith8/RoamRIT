# RoamRIT
A student-driven platform to discover and rate cafés, food spots, hangouts, and useful places around MSRIT.

The whole app now sits behind a login: opening the site sends you to a dedicated **`login.html`** page first; once you're logged in you land on **`index.html`**, and RoamRIT remembers you on that device so you won't be asked again until you log out. Both pages run on the same Supabase project as before.

## How the login gate works
- `login.html` is its own page with its own script (`login.js`) — a login/sign-up form, nothing else.
- `index.html` is the app itself. On load it checks for a Supabase session before showing anything: a small loading screen holds while that check runs, then either the app appears or the browser is sent to `login.html`.
- The Supabase JS client persists sessions in the browser by default, so "remembering" a returning user needs no extra code — closing the tab and coming back (or restarting the browser) keeps you logged in until the session expires or you log out.
- The **Log out** button (in the user pill, top right) signs out and sends you back to `login.html`.
- If Supabase isn't configured yet (`supabase-config.js` still has placeholder values), both pages skip the redirect and just show their normal "Supabase isn't configured" messaging instead of looping.

## Setup

### 1. Create a Supabase project
Go to [supabase.com](https://supabase.com) → New project. Wait for it to finish provisioning.

### 2. Run the database schema
Open **SQL Editor** in the Supabase dashboard → New query → paste in the entire contents of `schema.sql` from this repo → **Run**.

This creates four tables:
- `spots` — the places on the map (open to everyone to read and add to, matching the current app's behavior)
- `checkins` — reviews/check-ins on a spot
- `profiles` — one row per account, auto-created on sign-up (via a trigger), used to show a display name on the community board
- `posts` — the community board itself; anyone can read, only logged-in users can post, and only the author can delete their own post

### 3. Connect the app to your project
In the Supabase dashboard go to **Project Settings → API** and copy:
- **Project URL**
- **anon / public** key (never the `service_role` key)

Paste them into `supabase-config.js` (this one file is shared by both `index.html` and `login.html`):
```js
window.SUPABASE_URL = "https://YOUR-PROJECT-ref.supabase.co";
window.SUPABASE_ANON_KEY = "YOUR-ANON-KEY";
```

### 4. Turn on email sign-up
Email/password auth is on by default in Supabase. Two settings worth checking under **Authentication → Providers → Email**:
- **Confirm email** — ON means new users get a confirmation email before they can log in (recommended for a real launch). Turn it OFF while you're testing locally so sign-up logs you in immediately.
- **Site URL** and **Redirect URLs** under **Authentication → URL Configuration** — set these to wherever you deploy (e.g. your Netlify URL) so confirmation links point to the right place.

### 5. Deploy
This is a static site — `netlify.toml` is already set up with `publish = "."`. Push the folder to a Git repo and connect it in Netlify, or drag-and-drop the folder into Netlify's dashboard. Make sure `login.html` and `login.js` are deployed alongside everything else — the app links to `login.html` directly (not through a router), so it needs to exist at the site root.

### 6. Try it
- Open the site → you're sent straight to `login.html`. **Sign up** with an email, password, and display name.
- You land on the app (Explore tab). Your display name and avatar (top right) come from what you entered at sign-up.
- Visit the **Community** tab and post — the same identity shows up there.
- Reload the page, close the tab and reopen it, or restart the browser: you should stay logged in.
- **Log out** (top right) → you're sent back to `login.html`. Visiting `index.html` directly while logged out also redirects you to `login.html`.
- Adding a spot and posting a review still work the same as before — those stay open to everyone, unchanged, once you're in.

### Notes
- The anon key is safe to expose in client-side code — everything it can and can't do is controlled by the Row Level Security policies in `schema.sql`.
- Display names are editable data-wise (in `profiles.display_name`), but there's no in-app "edit profile" UI yet — that'd be a natural next addition if you want it.
- Posts are limited to 500 characters at the database level (`posts.body` check constraint) as well as in the textarea, so the two stay in sync even if someone bypasses the UI.
- Want spots/check-ins to also carry an author (rather than staying fully open)? Swap their `insert`/`update` policies in `schema.sql` to use `auth.uid() = ...` the same way `posts` does, and pass `user_id` in `script.js`'s insert payloads.
- "Remember me" is effectively always on right now, for as long as the Supabase session/refresh token stays valid (a few weeks by default). If you want a shorter or explicit "stay logged in" toggle, that's controlled by the `persistSession`/`autoRefreshToken` options passed to `createClient` — currently left at their (persistent) defaults.
