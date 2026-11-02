# Prototype (Phase 2)

A clickable mock of the main MVP flows, built as plain web pages (the same kind of page as the real app, PRD §12). It uses sample data only: no sign-in, no backend.

## Contents

| Page | What it's for | Status |
|---|---|---|
| [`directions/index.html`](directions/index.html) | Five visual directions (Contour, Forward, Plate, Phase Light, Marker) on the same Home screen, to pick the look (PRD §15 Q12). Replaces the first round (Instrument, Field Notes, Dusk), which is in git history | **Chosen: 04 Phase Light** |
| [`appearance/index.html`](appearance/index.html) | Interactive Phase Light Home screen + Settings › Appearance: five palettes, follow-phase color, Dark/Light mode, and a preview of each phase (PRD ACC-6) | For review |
| [`app/index.html`](app/index.html) | **Clickable MVP prototype v0.1** in Phase Light: onboarding (about you → activity → goal → phase → targets with the working), Home, Diary (edit/move/delete, copy yesterday, repeat breakfast), Nutrients with data coverage, the + sheet (recent, search, simulated barcode scan incl. "not found → create food", quick add, saved meals), Progress charts, Phase (progress read, targets and working, history, start a new phase), Profile and Appearance | For review |

### Prototype notes
- Sample person: Alex, 31, 5′11″, 194 lb, moderately active, recomp day 23. "Today" is fixed to Wed, Nov 25, 2026.
- Targets are calculated live with the PRD §8 formulas (a prototype copy, not the tested M1 engine).
- About 20 sample foods with approximate USDA values; one Open Food Facts item and one branded item list only label nutrients, to show coverage below 100%.
- Weight, waist and PR Forge lift history are generated sample data. Nothing is saved except the appearance choice (in the browser).
- Not yet in the prototype: weigh-in and waist entry screens, custom food editor outside the scan flow, saving a new meal, editing targets after onboarding, units switch, reminders.

## View it

Open `directions/index.html` in a browser. It loads its fonts from Google Fonts, so it needs a connection. Once `main` deploys to GitHub Pages, the prototype can also be opened on the iPhone.
