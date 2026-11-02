# Leanward app (`app/`)

The production web app (PRD §12): plain HTML, CSS and JavaScript with no build step, hosted on GitHub Pages, backed by Supabase, installed to the iPhone Home Screen. Built the same way as PR Forge.

> Status: **M0 — Foundations** (docs/development-plan.md). The shell installs, opens offline and checks its database connection. Real screens arrive in M3 onward; the clickable prototype shows where it's going.

## Run it on your PC

Needs Node 20 or newer.

```bash
cd app
node tools/serve.js
```

Open http://localhost:8001/ (PR Forge uses 8000, so both can run at once). The prototype is at http://localhost:8001/prototype/.

The offline cache (service worker) is off on localhost so a refresh always shows your edits. To test offline mode locally, open http://localhost:8001/?sw=1.

## Tests

```bash
cd app
node --test
```

The tests cover error-report masking and queueing, the offline cache list and version, namespacing (PR Forge shares this web address), database rules in `supabase/schema.sql`, and a check that no secret keys are committed. GitHub Actions runs them on every push and pull request.

## Deploy

Merging to `main` runs the tests, then publishes to **https://kevo00012.github.io/Leanward/** (prototype at `/Leanward/prototype/`).

**On every release:** bump `VERSION` in `js/config.js` and `CACHE` in `sw.js` to the same number (a test fails if they differ), so phones fetch the new files.

## One-time setup

1. **GitHub Pages:** repo Settings → Pages → Build and deployment → Source: **GitHub Actions**.
2. **Database:** open the PR Forge project in Supabase → SQL Editor → New query, paste all of `supabase/schema.sql`, click **Run**. It only creates `lw_` tables and never touches PR Forge's. Safe to run again.
3. Open the app → Profile → **About this build**. "Database" should say **Connected**.

## Layout

```
app/
├── index.html, manifest.webmanifest, sw.js, privacy.html
├── css/app.css            Phase Light styles
├── fonts/                 Onest (SIL Open Font License, fonts/OFL.txt), bundled so nothing loads from outside
├── icons/                 placeholder icons (replace when there's a logo)
├── js/
│   ├── config.js          version, Supabase URL and publishable key, storage prefix
│   ├── errors.js          error reports: masking, de-duplication, offline queue (pure, tested)
│   ├── cloud.js           Supabase connection check and error sending
│   ├── app.js             the shell UI
│   └── vendor/            supabase-js 2.118.0 (MIT), the same build PR Forge uses
├── supabase/schema.sql    Leanward's tables (lw_*), row level security, grants
├── tools/serve.js         local server
└── tests/                 node --test
```

## Rules that must hold

- **Shared web address with PR Forge.** Both apps live on `kevo00012.github.io`, which shares browser storage and caches. Every Leanward storage key starts with `leanward:v1:` and every cache with `leanward-`; Leanward never reads, writes or deletes anything else.
- **Secrets.** The Supabase publishable key in `js/config.js` is public by design. Never commit a secret or service-role key, a database password or an OAuth client secret.
- **Error reports** hold technical details only. Messages are masked (quoted text and numbers removed) and app state is never sent. Read them in Supabase → Table Editor → `lw_errors`.
