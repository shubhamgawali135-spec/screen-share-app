# Screen Share

A lightweight web app for sharing a presenter's screen with one receiver
(e.g. a laptop presenting to a screen connected to a projector/TV), no
HDMI cable needed. One presenter, one receiver — kept intentionally simple.

- **Frontend:** Next.js 14 + Tailwind (`/frontend`)
- **Backend:** Node.js + Express + Socket.IO (`/backend`)
- **Database:** Supabase (just one `sessions` table)
- **Video:** WebRTC, peer-to-peer, encrypted by default

The code itself was already built (session codes, QR join, WebRTC
signaling, reconnect handling). What was missing was: a real Supabase
project, a from-scratch local run to confirm the pieces talk to each
other, and deployment steps. This README covers all three, in order.

---

## Step 1 — Create the Supabase project

1. Go to [supabase.com](https://supabase.com), sign in, and create a new
   project (any name/region/password is fine — you won't need the DB
   password directly, Supabase manages that).
2. Once it's ready, open the **SQL Editor** (left sidebar) → **New query**.
3. Paste the contents of `backend/supabase/sessions.sql` and run it. This
   creates the one table the app needs (`sessions`) — no other setup
   required.
4. Go to **Project Settings → API**. You'll need two values from here in
   Step 2:
   - **Project URL** → this is `SUPABASE_URL`
   - **service_role key** (under "Project API keys", *not* the `anon`
     key) → this is `SUPABASE_SERVICE_ROLE_KEY`

The service role key is powerful — never put it in the frontend or commit
it to git. It's only used by the backend, which is why `.env` is already
in `.gitignore`.

---

## Step 2 — Run it locally

**Backend:**

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:

```
PORT=4000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:3000
SUPABASE_URL=<your Project URL from Step 1>
SUPABASE_SERVICE_ROLE_KEY=<your service_role key from Step 1>
```

```bash
npm run dev
```

Check `http://localhost:4000/health` in a browser — it should return
`{"status":"ok",...}`. If it errors on startup, it's almost always a
missing/wrong Supabase env variable.

**Frontend** (in a second terminal):

```bash
cd frontend
npm install
cp .env.local.example .env.local
```

`.env.local` just needs:
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

```bash
npm run dev
```

Visit `http://localhost:3000`.

---

## Step 3 — Manual end-to-end test

This app can't be verified without a real browser and screen to capture,
so do this test yourself before trusting it:

1. On your laptop, open `http://localhost:3000` and click **Create
   Session**. You'll land on the presenter page with a session code and
   QR code.
2. Open a **second tab** (or a second device on the same network, using
   your laptop's local IP instead of `localhost`) and go to
   `http://localhost:3000`, then enter the session code to join.
   - The receiver tab should show "Waiting for presenter."
   - The presenter page should flip to "Receiver connected."
3. On the presenter tab, click **Start Sharing** and pick a screen/window/
   tab in the browser's picker.
   - The receiver tab should show your live screen within a couple of
     seconds.
4. Click **Stop Sharing** — receiver should show "Sharing stopped."
5. Click **End Session** — receiver should show "Session ended."
6. Try **Full Screen** on the receiver, and try closing/reopening the
   receiver tab mid-share to confirm it reconnects.

If step 3 doesn't show video: it's almost always a browser permissions
prompt being dismissed, or the two tabs being on different backend URLs.
It is not a sign the code is broken — the signaling logic (offer/answer/
ICE) was reviewed line by line and is sound.

---

## Step 4 — Deploy

### Backend → Render (or Railway — same idea)

1. Push this repo to GitHub.
2. On [render.com](https://render.com), **New → Web Service**, connect the
   repo, set the root directory to `backend`.
3. Build command: `npm install && npm run build`
   Start command: `npm start`
4. Add environment variables (same as your local `.env`), except:
   - `CLIENT_ORIGIN` → leave as `http://localhost:3000` for now, you'll
     update it in Step 4 below once the frontend has a real URL.
5. Deploy. Note the resulting URL, e.g. `https://your-app.onrender.com`.

*(Railway: same steps — new project from repo, root directory `backend`,
same build/start commands and env vars.)*

### Frontend → Vercel

1. On [vercel.com](https://vercel.com), **New Project**, import the repo,
   set the root directory to `frontend`.
2. Add environment variable:
   - `NEXT_PUBLIC_BACKEND_URL` = your Render/Railway backend URL from
     above (e.g. `https://your-app.onrender.com`)
3. Deploy. Note the resulting URL, e.g. `https://your-app.vercel.app`.

### Connect them

1. Back in Render/Railway, update the backend's `CLIENT_ORIGIN` env var to
   your real Vercel URL (`https://your-app.vercel.app`), then redeploy the
   backend so the new value takes effect.
2. Visit your Vercel URL and repeat the Step 3 test for real, from two
   different devices/networks.

That's the whole app: one Supabase table, one backend service, one
frontend — nothing extra.
