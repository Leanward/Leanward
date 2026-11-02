# Leanward

A calorie and macro tracking app that also helps people run a cut, a body recomposition, a lean bulk, or maintenance — not just log food.

> Status: **Phase 3 — Build, milestone M0 (foundations).** PRD v1.2 signed off. Prototype v0.3 in `prototype/app/`. App: a web app like PR Forge (GitHub Pages + Supabase), on its own domain (to be set up; until then https://kevo00012.github.io/Leanward/ once Pages is switched on).

## How this project runs

| Phase | Output | Lives in | Done when |
|---|---|---|---|
| 1. PRD | Product requirements doc | [`docs/PRD.md`](docs/PRD.md) | Scope is agreed and signed off |
| 2. Prototype | Clickable prototype for joint iteration | [`prototype/`](prototype/) | The main flows feel right |
| 3. Build | The real app | [`app/`](app/) | MVP scope in the PRD ships |

The app build is broken into milestones in [`docs/development-plan.md`](docs/development-plan.md).

Decisions that change scope or architecture go in [`docs/decisions.md`](docs/decisions.md) so the reasoning stays with the project.

## Repository layout

```
.
├── docs/
│   ├── PRD.md          # Product requirements (Phase 1)
│   ├── development-plan.md  # Milestone plan for the app build (M0–M9)
│   └── decisions.md    # Running log of product/tech decisions
├── prototype/          # Phase 2 prototype
├── app/                # Phase 3 production app (web app: GitHub Pages + Supabase) — see app/README.md
├── CLAUDE.md           # Working agreement for AI-assisted sessions
├── .editorconfig
├── .gitattributes
└── .gitignore
```

## Getting started

```bash
git clone https://github.com/kevo00012/leanward.git
cd leanward
```

- **App:** `cd app && node tools/serve.js`, then open http://localhost:8001/. Tests: `cd app && node --test`. Setup and deploy: [`app/README.md`](app/README.md).
- **Prototype:** open `prototype/app/index.html` in a browser, or http://localhost:8001/prototype/ while the app server runs.
