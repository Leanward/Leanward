# Macro App (working title)

A calorie and macro tracking app that also helps people run a cut, a body recomposition, a lean bulk, or maintenance — not just log food.

> Status: **Phase 1 — PRD.** No app code yet. The tech stack is chosen after the PRD is agreed.

## How this project runs

| Phase | Output | Lives in | Done when |
|---|---|---|---|
| 1. PRD | Product requirements doc | [`docs/PRD.md`](docs/PRD.md) | Scope is agreed and signed off |
| 2. Prototype | Clickable prototype for joint iteration | [`prototype/`](prototype/) | The main flows feel right |
| 3. Build | The real app | [`app/`](app/) | MVP scope in the PRD ships |

Decisions that change scope or architecture go in [`docs/decisions.md`](docs/decisions.md) so the reasoning stays with the project.

## Repository layout

```
.
├── docs/
│   ├── PRD.md          # Product requirements (Phase 1)
│   └── decisions.md    # Running log of product/tech decisions
├── prototype/          # Phase 2 prototype
├── app/                # Phase 3 production app (stack TBD)
├── CLAUDE.md           # Working agreement for AI-assisted sessions
├── .editorconfig
├── .gitattributes
└── .gitignore
```

## Getting started

```bash
git clone https://github.com/kevo00012/macro-app.git
cd macro-app
```

Setup instructions for the prototype and the app will be added here when those phases start.
