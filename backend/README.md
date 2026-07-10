# Screen Share — Backend

Express + TypeScript + Socket.IO server. Handles session creation (via Supabase)
and relays WebRTC signaling (offer/answer/ICE) between one presenter and one
receiver.

See the root `README.md` (one level up) for the full setup walkthrough,
including Supabase project creation and deployment. Quick reference below.

## Local setup

```bash
cd backend
npm install
cp .env.example .env
```

Fill in `.env`:

```
PORT=4000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` come from your Supabase
project (Project Settings → API). Run `supabase/sessions.sql` in the
Supabase SQL Editor once before starting the server — it creates the
`sessions` table the backend reads and writes.

## Run locally

```bash
npm run dev      # nodemon + ts-node, auto-reloads on change
```

Visit `http://localhost:4000/health` — you should see `{"status":"ok",...}`.

## Build & run production

```bash
npm run build     # compiles to dist/
npm start         # runs compiled JS
```

## Endpoints

- `GET /health` → `{ status: "ok", uptime, timestamp }`
- `POST /api/sessions` → creates a session, returns `{ session }`
- `GET /api/sessions/:sessionCode` → looks up a session
- Socket.IO mounted on the same HTTP server, CORS restricted to `CLIENT_ORIGIN`
