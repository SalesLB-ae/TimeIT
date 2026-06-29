# ⏱ TimeIT

A fast, **offline-first** time tracker in the spirit of Clockify — built for ease of use and access. One click to start tracking, no account, no install, no server.

## Why it's easy to use & access

- **Zero setup** — it's a single static web app. Open `index.html` and start tracking.
- **One-click timer** — type what you're doing, hit ▶ (or press Enter). Hit it again to stop.
- **Works offline** — a service worker caches everything; install it as an app (PWA) on phone or desktop.
- **No login, no backend** — your data lives in your browser (`localStorage`). Private by default.
- **Dark mode** and a responsive layout that works on phones.

## Features

- ▶ Live timer with a ticking readout (also shown in the browser tab title).
- 🗂 **Projects** with colors; assign each entry to a project.
- 📝 Entries grouped by day with daily totals. Click any entry to edit times, or **resume** it with one tap.
- ➕ Manual time entry for when you forget to start the timer.
- 📊 **Reports** — totals for today / this week / this month with a per-project breakdown.
- ⬇ **Export to CSV** for invoicing or spreadsheets.

## Run it

It's fully static — any of these work:

```bash
# Option 1: just open the file
open index.html            # macOS  (xdg-open on Linux)

# Option 2: serve it (needed for the PWA/service worker)
python3 -m http.server 8000
# then visit http://localhost:8000
```

To install as an app, open it in Chrome/Edge/Safari and choose **Install / Add to Home Screen**.

## Project layout

```
index.html          markup + view structure
css/styles.css      styling, light/dark themes
js/
  store.js          localStorage persistence + state API
  format.js         duration / date formatting helpers
  timer.js          live ticking readout
  ui.js             rendering for entries & projects
  reports.js        totals, per-project breakdown, CSV export
  app.js            wires views, timer, and store together
manifest.json       PWA manifest
sw.js               service worker (offline cache)
icons/              app icons
```

No build step, no dependencies. Plain HTML/CSS/JS.

## Data & privacy

All time entries and projects are stored locally in your browser. Clearing site data removes them, so use **Export CSV** to keep backups. There is no telemetry and nothing leaves your device.

## Roadmap ideas

- Idle detection and reminders to start the timer
- Tags and billable rates
- Optional sync backend for multi-device use
- Weekly timesheet grid view
