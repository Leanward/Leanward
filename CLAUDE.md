# Working agreement

Context for anyone (human or AI) working in this repo.

## Product — Leanward
Calorie and macro tracker that also guides goal phases: cutting, body recomposition, lean bulking, maintenance. Source of truth for scope is `docs/PRD.md`; don't build features that aren't in it without updating it first.

## Process
1. **PRD** (`docs/PRD.md`) — the owner describes capabilities; the PRD is drafted and revised from feedback until scope is agreed.
2. **Prototype** (`prototype/`) — built only after PRD sign-off; used to iterate on flows and UI together.
3. **Build** (`app/`) — production app, built against the agreed PRD and prototype.

Record scope or architecture decisions in `docs/decisions.md` (date, decision, why).

## Engineering rules
- Never claim code was installed, run or tested unless it actually was. Don't fabricate test results; say what's unverified.
- When changing code, deliver complete updated files or a patch that applies cleanly — not disconnected snippets.
- Audit before rewriting. Preserve existing behavior. Make the smallest coherent set of changes and explain major tradeoffs.
- Ask a question only when a missing decision materially affects correctness.
- End code deliveries with: summary of changes, files changed, dependency changes, migrations, test results and known limitations, exact run instructions, prioritized remaining work.

## Git
- Default branch: `main`. Use short-lived feature branches (`feat/…`, `fix/…`, `docs/…`) and PRs for anything beyond docs.
- Conventional-ish commit messages: `docs: …`, `feat: …`, `fix: …`, `chore: …`.
- Line endings are normalized to LF via `.gitattributes` (the owner develops on Windows).

## Nutrition/health content
Calorie targets, deficits and rate-of-loss guidance must have safe floors and be explainable to the user — no opaque "scores". Formulas and their sources get documented in the PRD.
