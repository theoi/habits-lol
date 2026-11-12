# Habits

A calm, private habit tracker that runs in your browser and installs like an app.

**Live:** https://theoi.github.io/habits-lol/

- Daily, specific-weekday, and times-per-week habits
- Check-off or count goals (for example, 8 glasses of water), with optional notes
- Current and best streaks, a year heatmap, a month calendar, and weekly completion rates
- Edit any past day from the week strip on Today or the calendar on a habit's page
- Reminders while the app is open or running in a background tab
- Backup export and import (JSON)
- Works offline and installs to your home screen
- Light and dark themes that follow your system, and an optional compact list

All data stays on your device in IndexedDB. The app makes no network requests with your data and has no backend.
To look around without entering anything, tap **Try sample habits** on the first screen; it adds a few habits with about four months of history.

## Using it

- **Today** lists what is due, what is done, and what is not due today. Tap the circle to check off a habit, or use − and + for count goals. Tap a day in the week strip to edit a past day.
- **Habit page:** tap a habit for its streaks, completion chart, year heatmap, calendar, and notes. Tap a calendar day to change it or add a note.
- **Habits** reorders and archives habits. Archived habits keep their history and can be restored or deleted.
- **Settings:** week start (Monday or Sunday), compact list, notification permission, and backup export/import.
- **Install:** in Chrome or Edge, use the install button in the address bar or menu. On iPhone or iPad, open the site in Safari and choose Share → Add to Home Screen.

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

The first `pnpm e2e` needs a browser: `pnpm exec playwright install chromium`.
`node scripts/screenshots.mjs <url> <dir> [light|dark]` captures the main screens with sample data.

## How it works

- `src/lib`: pure logic for local calendar days, schedules, streaks, stats, reminders, backups, and habit icons. Days are `YYYY-MM-DD` keys in the device's local calendar, so daylight-saving changes and time zones never shift a check-in.
- `src/db`: IndexedDB storage via Dexie, including schema upgrades.
- `src/screens`, `src/components`: the React UI. Plain CSS with variables in `src/styles.css`.
- `src/reminders`: the reminder loop and notifications.
- `vite-plugin-pwa` generates the web app manifest and the offline service worker.

Pushes to `main` run lint, type checks, unit tests, and end-to-end tests (including an axe accessibility audit), then deploy to GitHub Pages.

## Rules

- A day counts as done when its count reaches the goal (1 for check-off habits).
- Day streaks count consecutive scheduled days that are done. Days the habit is not scheduled are skipped. An unfinished today does not break a streak.
- Weekly streaks count consecutive weeks that meet the weekly target. The current week counts once met and never breaks a streak while in progress. A habit's first week asks only for as many days as were left in it.
- Completion rate is done ÷ expected over the period, leaving out an unfinished today (or unfinished current week). Extra days beyond a weekly target don't raise it above 100%.
- A reminder fires once per habit per day, from its set time up to an hour later, and only if the habit is still due that day. It fires only while the app is open or running in the background; browsers can't run it when the app is fully closed.

## Backups

Export writes a versioned JSON file (`format: "habits-lol-backup"`, `version: 1`) with your habits, check-ins, and settings. Import checks the whole file first and changes nothing if any part is invalid; if it is valid, it replaces all data after you confirm. Backups made before line icons replaced emoji still import; emoji icons are mapped to the closest line icon.
