# Screen Share — Frontend

Next.js 14 (App Router) + TypeScript + Tailwind. Presenter and receiver UIs,
fully wired to the backend: session join, WebRTC screen capture, live video,
QR code, and reconnect handling.

See the root `README.md` (one level up) for the full setup walkthrough.
Quick reference below.

## Local setup

```bash
cd frontend
npm install
cp .env.local.example .env.local
```

Set `NEXT_PUBLIC_BACKEND_URL` in `.env.local` to your running backend
(defaults to `http://localhost:4000`).

## Run locally

```bash
npm run dev
```

Visit `http://localhost:3000`.

## Pages

- `/` — create a session (redirects to `/present/[sessionCode]`) or join one
  by code (redirects to `/view/[sessionCode]`)
- `/present/[sessionCode]` — presenter: session code, QR code, Start/Stop
  Sharing, End Session
- `/view/[sessionCode]` — receiver: live video, Leave/Reconnect/Full Screen
