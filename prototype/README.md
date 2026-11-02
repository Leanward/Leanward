# Prototype (Phase 2)

A clickable mock of the main MVP flows, built as plain web pages (the same kind of page as the real app, PRD §12). It uses sample data only: no sign-in, no backend.

## Contents

| Page | What it's for | Status |
|---|---|---|
| [`directions/index.html`](directions/index.html) | Five visual directions (Contour, Forward, Plate, Phase Light, Marker) on the same Home screen, to pick the look (PRD §15 Q12). Replaces the first round (Instrument, Field Notes, Dusk), which is in git history | **Chosen: 04 Phase Light** |
| [`appearance/index.html`](appearance/index.html) | Interactive Phase Light Home screen + Settings › Appearance: five palettes, follow-phase color, Dark/Light mode, and a preview of each phase (PRD ACC-6) | For review |

Planned next, in Phase Light: onboarding (goal → phase → targets with the working), Diary and the add flow, Progress and Phase, Profile.

## View it

Open `directions/index.html` in a browser. It loads its fonts from Google Fonts, so it needs a connection. Once `main` deploys to GitHub Pages, the prototype can also be opened on the iPhone.
