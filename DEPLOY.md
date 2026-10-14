# Deployment Guide — home-task-app (Frontend)

The frontend stays on **Vercel** (already free, permanently — this wasn't
what broke). The backend moved from Railway to Render; see
`home-task-service/DEPLOY.md` for that side.

## 1. Deploy to Vercel

1. Open [vercel.com](https://vercel.com) and import this repository.
2. Framework preset: `Vite`.
   `Build Command`: `npm run build`
   `Output Directory`: `dist`
3. Add this environment variable:

```text
VITE_API_URL = https://home-task-service.onrender.com
```

(use your actual Render URL from the backend deploy)

4. Click `Deploy`. Copy the generated URL, e.g. `https://home-task.vercel.app`.
5. Go back to the backend's Render env vars and set `FRONTEND_URL` to this
   Vercel URL, so CORS allows it.

## 2. Install it on the kids' phones (PWA)

The app is now a installable Progressive Web App — no app store needed.

**Android (Chrome):**
1. Open the Vercel URL in Chrome.
2. Tap the ⋮ menu → `Add to Home screen` (or Chrome may prompt automatically).

**iPhone (Safari — must be Safari, not Chrome, for this to work on iOS):**
1. Open the Vercel URL in Safari.
2. Tap the Share icon → `Add to Home Screen`.

Either way it opens full-screen like a native app, with its own icon.

## 3. Turn on the reminders (push notifications)

On each kid's phone, open the board and, in **🔔 Lembretes neste celular**, tap
the kid's name and allow notifications. They get a notification at 12:00 and at
19:00 listing the tasks still open that day ("Enviar teste" checks it right away).

- **iPhone:** only works in the app installed on the home screen (Safari →
  Compartilhar → Adicionar à Tela de Início), iOS 16.4 or later. In Safari itself
  the card just shows that tip.
- The backend must have the VAPID keys and `CRON_TOKEN` set (see the backend's DEPLOY.md).
- The handlers live in `public/push-sw.js`, imported into the generated service
  worker through `workbox.importScripts` in `vite.config.ts`.

## Local Development

```bash
cp .env.example .env.local
npm install
npm run dev
# App at http://localhost:5173 (proxies /api to http://localhost:8080)
```

## Updating Later

Any `git push` to `main` triggers an automatic redeploy on Vercel.

## What changed in this pass

- Rule engine is now punitive: completing a task on time earns no points;
  a −1 "occurrence" only happens for a missed deadline, or a manually
  registered "not done / incomplete" penalty.
- New weekly consequence ladder (1st–6th occurrence) shown on the board and
  week view.
- Task checklists (the "- passo" lines in each task's description) must all
  be checked before a task can be marked complete.
- The lunch table task is always `BOTH` (joint) — completing it marks it
  done for both children at once, per the house rule that lunch cleanup is
  always done together.
- Added installable PWA support (manifest, icons, offline app shell — API
  calls always go live, never cached).
