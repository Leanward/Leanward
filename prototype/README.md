# Prototype (Phase 2)

A clickable mock of the main MVP flows, built as plain web pages (the same kind of page as the real app, PRD §12). It uses sample data only: no sign-in, no backend.

## Contents

| Page | What it's for | Status |
|---|---|---|
| [`directions/index.html`](directions/index.html) | Five visual directions (Contour, Forward, Plate, Phase Light, Marker) on the same Home screen, to pick the look (PRD §15 Q12). Replaces the first round (Instrument, Field Notes, Dusk), which is in git history | **Chosen: 04 Phase Light** |
| [`appearance/index.html`](appearance/index.html) | Interactive Phase Light Home screen + Settings › Appearance: five palettes, follow-phase color, Dark/Light mode, and a preview of each phase (PRD ACC-6) | For review |
| [`app/index.html`](app/index.html) | **Clickable MVP prototype v0.3** in Phase Light. Covers every MVP flow in PRD §6: onboarding (units, optional body fat/waist with Katch-McArdle option, activity, goal, phase and rate, targets with the working, food preferences, home-screen install); Home with quick log and one insight; Diary (edit/move/delete, copy day, repeat breakfast, save a meal, copy a meal to another day) and Nutrients with data coverage; the + sheet (recent, search with raw/cooked ranking, simulated barcode incl. not-found → create, quick add, saved meals, custom foods, private copy, report); Progress (log weight, circumferences, body fat, lifts; charts; All entries with edit/delete); Phase (progress read, edit targets as a new version, target history, end-of-phase prompt, start a new phase); Profile (appearance, US/metric units, diary slots, key lifts, food preferences, my foods and meals, reminders, PR Forge, export, delete account, support link) | For review |

**New in v0.3:** Diary › Nutrients is a full panel (31 nutrients in Fats, Carbohydrates, Minerals, Vitamins) with % of DRI, limits and ULs, data coverage, Day / 7-day average, a "furthest from target" summary, a ratios and quality card, sort by furthest first, and tap-to-expand top sources and foods high in each nutrient (PRD NUT-6/7). Per-meal macros under each Diary slot. **Lab results (Phase 2 preview, PRD §6.10):** Progress › Lab results with sample history, flags against the ranges on each report, nutrition links, kidney safety, suggestions you accept or decline, a marker detail screen, and "Import labs" (simulated PDF import with a check-before-saving step) and optional "Add by hand" with the range from your report.

### Prototype notes
- Sample person: Alex, 31, 5′11″, 194 lb, moderately active, recomp day 23. "Today" is fixed to Wed, Nov 25, 2026.
- Targets are calculated live with the PRD §8 formulas (a prototype copy, not the tested M1 engine).
- About 23 sample foods with approximate USDA values for 31 nutrients; one Open Food Facts item and one branded item list only label nutrients, to show coverage below 100%.
- Weight, waist and PR Forge lift history are generated sample data. Nothing is saved except the appearance choice (in the browser).
- Simulated, not real: sign-in, the camera, PR Forge data, notifications, export and account deletion. Past weights, waist and PR Forge lifts are generated sample data.
- Tested by driving every flow in an automated Chromium browser (no script errors). Not yet tried on a real iPhone in Safari.

## View it

Open `directions/index.html` in a browser. It loads its fonts from Google Fonts, so it needs a connection. Once `main` deploys to GitHub Pages, the prototype can also be opened on the iPhone.
