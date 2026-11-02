# Leanward

A calorie and macro tracking app that also helps people run a cut, a body recomposition, a lean bulk, or maintenance — not just log food.

> Status: **Phase 1 — PRD** (v0.2, a few questions still open). No app code yet. Stack decided: a web app like PR Forge (GitHub Pages + Supabase).

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
├── app/                # Phase 3 production app (web app: GitHub Pages + Supabase)
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

Setup instructions for the prototype and the app will be added here when those phases start.
