# Leanward — Development Plan (app build-out)

> **Version:** 0.1 (draft, for review) · **Date:** 2026-11-02 · **Owner:** Kevin Chavez
> **Based on:** [`PRD.md`](PRD.md) v0.1. Requirement IDs (ONB-1, LOG-4 …) refer to PRD §6–§10.
> **Status:** draft. The PRD isn't signed off yet, so this plan **assumes the PRD's recommended answers** to the §15 open questions (see §2). If an answer changes, the affected milestones are listed in §2.

**Naming.** "Phase" already means two things in this project: a product release (PRD §5: Phase 1 MVP, Phase 2, Phase 3) and a diet phase (cut, recomp …). To avoid a third meaning, the build is split into **milestones M0–M9**. Everything in M0–M9 is product Phase 1 (MVP). Phase 2 and 3 work is outlined in §7.

---

## 1. Overview

| # | Milestone | Delivers | Main PRD refs | Size* |
|---|---|---|---|---|
| M0 | Foundations | Repo structure, tooling, CI, environments, Apple/EAS setup | §10, §12 | S |
| M1 | Calculation engine | Pure, versioned, unit-tested TypeScript package for all of §8 | §8, §10 Correctness | M |
| M2 | Data model, security and sync | Postgres schema + RLS, on-device SQLite, offline sync engine | §11, §10 Offline/Security, LOG-12 | L |
| M3 | Auth, onboarding and phases | Sign-in, profile, goal → phase → targets with the working shown, phase management | ONB-*, PHS-* | M |
| M4 | Food catalog and search | USDA + Open Food Facts import, search API, barcode lookup, source badges | §7 FDB-*, LOG-3/4 | L |
| M5 | Food logging and nutrition | Diary, add sheet, barcode, quick add, custom foods, saved meals, copy, nutrient views | LOG-*, NUT-* | L |
| M6 | Measurements and progress | Weight + trend, waist, lifts, charts, phase progress read | MEA-*, PRG-*, PHS-4 | M |
| M7 | Home, account and data | Home screen, settings, units, export, account deletion, notifications | HOM-*, ACC-*, §6.9 | M |
| M8 | Hardening and beta | Performance, accessibility, instrumentation, privacy/legal, TestFlight beta | §9, §10, §13, §14 | M |
| M9 | Launch | Beta fixes, P1 fast-follows, App Store submission | §13 | S |

\*Relative size only (S / M / L). Calendar estimates come after M0 and the M2 sync spike, when there's real velocity to estimate from; any number given now would be a guess.

**Order and overlap**

```
PRD sign-off
   │
   ├── Prototype (prototype/) ───────────────┐   UI flows agreed here before M3/M5/M6/M7 UI work
   │                                          │
   ├── M0 Foundations                         │
   │     ├── M1 Calc engine ──────────────────┼──► M3 Onboarding ──► M5 Logging ──► M6 Progress ──► M7 Home/Account ──► M8 Beta ──► M9 Launch
   │     ├── M2 Data + sync ──────────────────┘          ▲
   │     └── M4 Food catalog (backend) ──────────────────┘
```

- **M1, M2 and M4 have no UI**, so they can run alongside the prototype once the PRD is signed off. That shortens the path without breaking the PRD → prototype → build rule for anything users see.
- **Critical path:** M2 (sync) → M5 (logging). Offline-first logging (S6, LOG-12) is the riskiest technical piece, so M2 starts with a spike.
- **Screen work (M3, M5–M7) starts only after the prototype has settled the matching flow.**

## 2. Assumptions this plan depends on

| PRD §15 question | Assumed answer | If the answer changes |
|---|---|---|
| Q1 Scope changes S1–S6 | Accepted | Removing S1/S2 shrinks M6; removing S6 simplifies M2 a lot (online-only) |
| Q2 Tech stack | Expo + React Native + TypeScript, Supabase | Native Swift would mean rewriting M0, M2, M3, M5–M7; M1 would be ported to Swift |
| Q3 Accounts | Sign-in required from day one | Local-only use adds a migration path to M2/M3 |
| Q4 Food data | USDA + Open Food Facts hybrid | A commercial API would replace most of M4's import work with an integration |
| Q5 Region | US-only (US foods, US DRIs, lb default) | International support adds food sources and DRI tables to M1/M4 |
| Q7 §8 defaults | As written | Only constants in M1 change |
| Q8 Exercise calories | Not added back | Adding them requires Apple Health, which is Phase 2 |

**Other assumptions**
- **Solo build, AI-assisted.** Milestones are ordered so there's always a working, testable app on `main`.
- **You develop on Windows.** You can't run an iOS simulator or build iOS apps locally, so iOS builds use **EAS Build** (cloud) and testing uses a development build on your iPhone. Expo Go is for early UI checks only. An **Apple Developer Program membership ($99/yr)** is needed by the end of M0.
- **iOS 17+ only** (§10). Android stays possible but isn't built or tested.

## 3. Proposed repository layout (under `app/`)

CLAUDE.md puts production code in `app/`, so `app/` becomes a small monorepo:

```
app/
├── mobile/              # Expo app (iOS)
├── packages/
│   ├── calc/            # M1 — calculation engine, no UI or I/O dependencies
│   └── shared/          # Types, nutrient IDs and units, validation schemas used by mobile + backend
├── supabase/            # Migrations, RLS policies, edge functions, seed data, DB tests
└── tools/
    └── food-import/     # M4 — USDA / Open Food Facts import pipeline
```

Package manager: **pnpm workspaces**, a common choice for Expo monorepos. To be confirmed in M0.

## 4. Milestones in detail

Each milestone has an **exit criteria** list. A milestone is done when every item is met and verified, not just written.

### M0 — Foundations
**Goal:** an empty app that builds, installs on your phone and talks to a dev backend, with CI guarding `main`.

- Monorepo per §3; TypeScript strict mode; ESLint + Prettier; `.editorconfig` and LF line endings kept.
- Expo app scaffold (Expo Router for the five tabs + global **+**, §6.9) with placeholder screens.
- Supabase: **dev** and **prod** projects (staging is added in M8 if needed); migrations managed by the Supabase CLI and checked in; secrets kept out of the repo and app bundle (§10 Security).
- EAS: development, preview (TestFlight) and production build profiles; bundle ID; app icon placeholder.
- CI (GitHub Actions): install, lint, typecheck, unit tests on every PR; the `main` branch requires checks to pass.
- Error reporting: **decision needed.** ACC-3 allows first-party analytics only, while crash reporting normally means a third party (e.g. Sentry). Proposed: allow a crash reporter with breadcrumbs and payloads scrubbed of all food and body data, and record it in `decisions.md`.

**Exit criteria:** a dev build installs on your iPhone from EAS; the app reads a test row from Supabase dev; CI is green on a PR; run instructions are in `README.md`.

### M1 — Calculation engine (`packages/calc`)
**Goal:** every number Leanward shows comes from one pure, tested, explainable module.

- BMR (Mifflin-St Jeor incl. the "prefer not to say" midpoint; Katch-McArdle), TDEE by activity level (§8.1).
- Safety floors and caps: calorie floor, deficit cap, rate caps, underweight guard, pregnancy/breastfeeding rule, floors on manual edits (§8.2).
- Phase calorie targets for every phase type and rate option (§8.3).
- Macros and fiber: protein by reference weight (incl. the BMI > 30 rule), fat default and floor, carb remainder with the < 50 g handling, fiber 14 g/1,000 kcal, warnings for manual splits (§8.4).
- DRI tables (RDA/AI/UL) by age and sex for the NUT-2 nutrients (NUT-3).
- Weight trend (EWMA α = 0.1, first weigh-in of the day, carry-forward), weekly average, 14-day rate (§8.5).
- Epley e1RM (≤ 12 reps) (§8.7).
- Phase progress read: signals, thresholds and the "collecting data" rule (PRG-2, PRG-3), returning on track / watch / off track **plus the numbers behind it**.
- **Explanations as data:** every function returns its result *and* a structured breakdown ("BMR 1,780 × 1.55 = 2,760 …") that the UI renders (ONB-7; CLAUDE.md "no opaque scores").
- `calcVersion` constant stored on each phase and target set (§11), so results can be reproduced after formulas change.
- Unit conversion helpers (lb/kg, in/cm) with a fixed rounding policy.
- Optional early start: the adaptive TDEE function (§8.6) isn't used in the MVP, but writing it against the same data shapes proves the data model supports it.

**Testing:** a test file per section, with **hand-worked examples** written into the tests (inputs, expected output, the arithmetic in a comment). It covers every phase × rate, every floor and cap, and boundary cases (BMI 18.5/30, age 18, 12 vs 13 reps, < 14 days of data).

**Exit criteria:** 100% of §8 implemented; tests pass in CI; each formula's source is cited in code comments matching PRD Appendix A; you've checked a sample of worked examples by hand.

### M2 — Data model, security and sync
**Goal:** data lives on the device first, syncs safely, and no user can ever read another user's rows.

- **Spike first (time-boxed):** pick the sync approach and record it in `decisions.md`. Options:
  - **Custom outbox:** expo-sqlite locally, client-generated UUIDs, idempotent upserts, `updated_at` last-write-wins per row (matches §10), soft deletes. Full control, more code.
  - **PowerSync** (Supabase integration): less sync code to write, but a paid service beyond its free tier and another vendor in the data path.
  - **WatermelonDB:** mature local DB with a sync protocol, but the backend side has to be written.
  - Proposed default: **custom outbox**. The data is almost entirely single-user and per-row, which keeps conflicts simple. Revisit if the spike shows otherwise.
- Postgres schema for every §11 entity, including `Recommendation` (unused until Phase 2) so the model is ready. Nutrients stored per 100 g using a fixed nutrient-ID list from `packages/shared`.
- DiaryEntry **nutrient snapshot** at log time (§4 Intake).
- Row-level security on every user-owned table; shared catalog tables are read-only to clients.
- Soft deletes + tombstones so deletions sync; hard delete only in account deletion (ACC-1).
- Encryption at rest (Supabase default) noted for the privacy review in M8.

**Testing:** automated RLS tests (user A can't read, write or delete user B's rows on any table); sync tests for offline create/edit/delete, replaying the same change twice (no duplicates, LOG-12), and two devices editing the same entry.

**Exit criteria:** schema migrations apply cleanly from empty; RLS tests pass; a test entry created offline on the phone shows up in Postgres once the phone is back online, exactly once.

### M3 — Auth, onboarding and phases
**Goal:** a new user gets from install to a confirmed phase with explained targets in ≤ 2 minutes.
**Needs first:** prototype onboarding flow agreed; M1, M2.

- Sign in with Apple + email/password, email verification, password reset (ONB-1).
- Profile capture incl. 18+ gate, sex-for-calculation, height, weight, activity level with descriptions, training/week (ONB-2); optional BF% + source, waist (ONB-3); optional pregnancy/breastfeeding question (§8.2).
- Goal → suggested phase → confirm (ONB-4); rate picker showing expected weekly change in the user's units (ONB-5).
- Targets screen with the working and editable targets, floors enforced (ONB-7).
- Units at onboarding, changeable later (ONB-9).
- Phase management: one active phase, start a new phase (closes the old one), change goal without losing history, mid-phase target edits create a new target-set version (PHS-1, -2, -3, -5, -7).
- P1: dietary preferences (ONB-6), planned-end prompt (PHS-6).

**Exit criteria:** onboarding finished in ≤ 2 minutes with optional steps skipped (ONB-8, timed on device); targets match M1 output for a set of test profiles; underweight and pregnancy guards checked by hand.

### M4 — Food catalog and search
**Goal:** fast, honest food search and barcode lookup over our own database.
**Can start:** in parallel with M1/M2 after M0.

- Import pipeline (`tools/food-import`) for USDA FoodData Central **bulk downloads**: Foundation, SR Legacy, FNDDS and Branded (FDB-2). It's repeatable and can be re-run without creating duplicates; branded data is refreshed monthly.
- Name cleanup for generic foods (readable names, raw/cooked state in the name, LOG-6).
- Open Food Facts barcode fallback in **its own table**, with attribution and any corrections kept separable (FDB-3). Records missing calories or any macro are hidden (FDB-6).
- Source metadata and verification badges on every food (FDB-1).
- One canonical record per barcode; collapsing near-identical names (FDB-4).
- Search endpoint: Postgres full-text + trigram; ranking = the user's own history → verified → community (FDB-4); results include serving, kcal, protein and badge (LOG-3).
- Barcode lookup endpoint (UPC-A/E, EAN-8/13 normalized to GTIN-14).
- Food reports table and endpoint (FDB-5).
- Legal: Open Food Facts attribution text and legal page draft; re-check USDA/OFF terms (PRD §7).

**Testing:** import tests on a small fixture of real records; a search-quality set of ~100 common queries with expected top-5 results (tracks the §13 "search success ≥ 80%" target); latency measured against §10 (< 800 ms p95 server search, < 1.5 s barcode).

**Exit criteria:** the full USDA catalog is imported into dev; the search-quality set passes its agreed threshold; p95 latency meets §10 on the dev project; barcode hit rate measured on a sample of ~50 US packaged foods from your pantry (target ≥ 85%, §13).

### M5 — Food logging and nutrition display
**Goal:** daily logging that's fast, works offline, and shows trustworthy nutrient totals.
**Needs first:** prototype diary + add flow agreed; M2, M3, M4.

- Diary by day with configurable slots (LOG-1); global **+** opening on Recent/Frequent with search focused (LOG-2).
- Search results and food detail page with the full panel per serving and per 100 g, plus source and verification (LOG-3, NUT-5).
- Barcode scanning with the camera; not found → create food with barcode prefilled (LOG-4).
- Serving units and free quantities (LOG-5); quick add (LOG-7); custom foods (LOG-8).
- Saved meals with one-tap logging and scaling (LOG-9); copy meal or day, "repeat yesterday's breakfast" (LOG-10); edit, delete, move (LOG-11).
- Offline: recents, frequents, custom foods, saved meals and previously scanned foods are cached on the device (§10 Offline, LOG-12).
- Day view totals vs targets incl. fiber (NUT-1); nutrient detail screen (NUT-2) with DRI targets, neutral "above UL" (NUT-3) and **data coverage** below 100% (NUT-4, S5).
- Neutral over-target styling and copy (LOG-13).
- Food reports and "make a private copy" (FDB-5).

**Testing:** unit tests for nutrient totals, snapshots and coverage; end-to-end flows on device (Maestro or similar, run via EAS or by hand) for search-log, barcode-log, saved-meal-log, copy-day and offline-log-then-sync.

**Exit criteria:** a saved meal logs in ≤ 3 taps and a frequent item in ≤ 5 s (G1, §13); a full day can be logged in airplane mode and syncs with no duplicates; coverage is shown correctly for a branded-only day.

### M6 — Measurements and progress
**Goal:** the core differentiator. The app can tell Alex his recomp is working.
**Needs first:** prototype progress + phase screens agreed; M1, M2, M3.

- Weight logging, multiple a day, first-of-day used for the trend (MEA-1); trend and weekly average labelled "derived" (MEA-2).
- Waist with how-to-measure guidance (MEA-3); other circumferences (P1); body-fat entries always labelled "estimate" (MEA-4, P1).
- Key lifts: pick up to 5, log top set, e1RM over time (MEA-5).
- Edit/delete for every measurement (MEA-6).
- Charts: weight dots + trend, waist, e1RM per lift, average calories and protein vs target; 4w / 12w / 6m / all ranges; phase boundaries drawn on every chart (PRG-1). VoiceOver spoken summaries for every chart (§9).
- Phase progress read per phase type, with "collecting data" state and plain copy (PRG-2, -3, -4).
- Phase tab: goal, phase + day count, targets, progress read, phase history (PHS-4).

**Testing:** progress-read tests in M1 cover the logic; here, seeded data sets for each persona (Alex recomp, Maya cut, Sam nutrition-only) checked on screen against the expected read.

**Exit criteria:** each persona's seeded data produces the expected progress read and copy; charts render 6 months of daily data smoothly on device.

### M7 — Home, account and data
**Goal:** the app is complete enough to hand to beta testers.
**Needs first:** prototype home screen agreed; M3, M5, M6.

- Home: calories remaining + P/C/F (HOM-1), phase card with headline signal (HOM-2), ≤ 4 cards (HOM-5); P1: quick log by time slot (HOM-3), one daily insight (HOM-4).
- Profile/settings: units, slots, targets, phase links.
- Export all data as CSV and JSON (ACC-2).
- In-app account deletion removing all server data (ACC-1), via a server-side function.
- Eating-disorder resources link (ACC-4).
- Entitlement check stub so premium can be switched on later (S4); no paywall.
- P1: reminders, off by default and never shaming (ACC-5).

**Exit criteria:** export round-trips (every entity present in the files); deleting an account removes every row for that user (verified by query); all P0 requirements in PRD §6 are implemented.

### M8 — Hardening and beta
**Goal:** meet the non-functional bar and learn from real users.

- Performance against §10: cold start < 2 s, cached search < 300 ms, server search < 800 ms p95, barcode < 1.5 s, all measured on a real device.
- Reliability: crash-free sessions ≥ 99.5% target; sync stress test (long offline period, many edits).
- Accessibility pass: Dynamic Type, VoiceOver labels, 4.5:1 contrast, color never the only signal (§9).
- Instrumentation: first-party event counts only, no food names or body data (ACC-3, §13); dashboard for the §13 metrics.
- Privacy: App Store privacy label, privacy policy, terms; OFF attribution live; licensing re-check (§7, §14).
- Copy review for neutral tone across every screen (§9, LOG-13, PRG-4).
- Name checks before store listing: App Store, domain, USPTO (§14, decisions log).
- TestFlight beta with a small cohort; feedback channel.

**Exit criteria:** every §10 target measured and met (or a logged decision to accept the gap); beta has run long enough to read day-7 retention; no open data-loss bugs.

### M9 — Launch
- Fix beta findings; ship any P1 items that slipped (P1 = "can slip to a fast follow", PRD §6).
- App Store assets, listing and review submission (account deletion, health-data and age-rating answers ready).
- Production Supabase project hardened: backups, usage alerts (§14 cost risk).
- Post-launch: watch the §13 metrics and food reports; start the Phase 2 backlog.

## 5. Cross-cutting practices

- **Branches and PRs:** `feat/…`, `fix/…`, `docs/…` branches with a PR for every change (CLAUDE.md); CI must pass before merge.
- **Definition of done** for any requirement: implemented, tests written where logic is involved, checked on a real device for UI, offline behavior checked where relevant, and the PRD ID cited in the PR.
- **Testing layers:** unit (calc, shared, nutrient math) → database (migrations, RLS) → sync → end-to-end on device. Untested or unverified items are called out in the PR, never implied.
- **Decisions:** anything that changes scope or architecture (sync approach, crash reporter, package manager, search engine) goes in `decisions.md`.
- **Scope control:** if a milestone runs long, cut or defer P1s before slipping P0s (PRD §14). New ideas go into the PRD first, not straight into code.
- **Health-content rule:** any change to a target, floor or progress rule goes through M1 with tests and a PRD §8 update. No inline math in UI code.

## 6. Build risks

| Risk | Milestone | Mitigation |
|---|---|---|
| Offline sync is harder than expected | M2, M5 | Time-boxed spike first; keep the data model per-row and per-user; idempotency tests in CI |
| No local iOS tooling on Windows | All UI | EAS cloud builds + dev build on your phone; keep the JS-only feedback loop (Expo dev server) fast |
| USDA data needs more cleanup than expected | M4 | Start M4 early, alongside the prototype; measure search quality with a fixed query set |
| Barcode coverage below 85% | M4 | Measure early; a commercial API is the fallback (PRD §7) |
| MVP too large for one person | All | Strict P0/P1 split; milestones end with a usable app; cut P1s first |
| Formula or threshold errors reach users | M1, M6 | Hand-worked tests, explanations shown to users, `calcVersion` on stored targets |

## 7. After the MVP (outline)

These are planned in detail when the MVP ships. They're listed so M1/M2 choices leave room for them.

**Product Phase 2 — Advanced nutrition** (PRD §5.3)
- Adaptive TDEE + Recommendations with accept/decline (§8.6). The data model is ready from M2, and the function can be written early in M1.
- Weekly check-ins, reverse diet, phase comparisons.
- Apple Health / Apple Watch (needs a dev-build native module), exercise-calorie policy revisited (Q8).
- Recipe builder, advanced micronutrient reports, pattern insights, advanced search.
- Progress photos (private storage, privacy review).
- Subscriptions/premium behind the M7 entitlement check.
- AI photo and voice logging, always badged "AI-estimate" (FDB-1).

**Product Phase 3 — Body composition platform** (PRD §5.4)
- Advanced adaptive model, Garmin, body-composition analytics, training-performance integration, meal planning, coach/dietitian sharing.

## 8. Immediate next steps

1. **Answer PRD §15** (or reply "agree"). This plan's assumptions in §2 follow those answers.
2. Review this plan, especially the milestone order, the M1/M2/M4 overlap with the prototype, and the M0 crash-reporting question.
3. On PRD sign-off: start the **prototype** and **M0** together; join the Apple Developer Program.
4. Then M1 and the M2 sync spike, followed by M4, all while the prototype iterates.
