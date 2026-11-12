# Habits

A calm, private habit tracker that runs in your browser and installs like an app.

**Live:** https://theoi.github.io/habits-lol/

- Daily, specific-weekday, and times-per-week habits
- Check-off or count goals (for example, 8 glasses of water), with optional notes
- Current and best streaks, a year heatmap, a month calendar, and weekly completion rates
- Edit any past day
- Reminders while the app is open or running in a background tab
- Backup export and import (JSON)
- Works offline and installs to your home screen

All data stays on your device in IndexedDB. The app makes no network requests with your data and has no backend.

## Development

Requires Node 22+ and pnpm (the version is pinned in `package.json`; `corepack enable` picks it up).

```bash
pnpm install
pnpm dev          # http://localhost:5173/habits-lol/
pnpm test         # unit tests (Vitest)
pnpm e2e          # end-to-end tests (Playwright, phone and desktop viewports)
pnpm lint && pnpm typecheck
pnpm build        # production build in dist/
```

Set `VITE_DEMO=1` at build time to load sample habits on a device's first visit.

## How it works

- `src/lib`: pure logic for local calendar days, schedules, streaks, stats, reminders, and backups. Days are `YYYY-MM-DD` keys in the device's local calendar, so daylight-saving changes and time zones never shift a check-in.
- `src/db`: IndexedDB storage via Dexie.
- `src/screens`, `src/components`: the React UI.
- `vite-plugin-pwa` generates the web app manifest and the offline service worker.

Pushes to `main` run lint, type checks, and unit and end-to-end tests, then deploy to GitHub Pages.

## Rules

- A day counts as done when its count reaches the goal (1 for check-off habits).
- Day streaks count consecutive scheduled days that are done. Days the habit is not scheduled are skipped. An unfinished today does not break a streak.
- Weekly streaks count consecutive weeks that meet the weekly target. The current week counts once met and never breaks a streak while in progress. A habit's first week asks only for as many days as were left in it.
- Completion rate is done ÷ expected over the period, leaving out an unfinished today (or unfinished current week).
- A reminder fires once per habit per day, from its set time up to an hour later, only if the habit is still due that day.
