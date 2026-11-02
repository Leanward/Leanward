# Leanward — Product Requirements Document

> **Version:** 0.1 (first draft, for review) · **Date:** 2026-11-02 · **Owner:** Kevin Chavez
> **Source:** [`blueprint-v2.md`](blueprint-v2.md) (Product Vision v2.0). Where this PRD adds detail, changes scope, or makes a call the blueprint left open, it is marked **[Proposed]** so you can accept or reject it.
> **How to review:** react to anything, but the fastest path to sign-off is answering the numbered questions in §15.

---

## 1. Summary

Leanward is an iPhone-first nutrition tracker organized around the user's **goal** (what they want) and **phase** (the nutritional strategy they're running now). It combines Cronometer-level nutrient depth, MacroFactor-style adaptive targets (from Phase 2), and progress assessments that judge each phase by the right signals — not just the scale.

**Tagline:** Move toward better.
**Principle:** Your nutrition should support your goals, not dictate them.

## 2. Problem and goals

**Problem.** Most trackers treat every user as someone trying to lose weight, judge success by the scale alone, and either hide nutrient depth (MyFitnessPal, Lose It!) or bury users in it (Cronometer). Lifters doing a recomp or lean bulk get almost no useful feedback: maintaining weight while losing waist and gaining strength looks like "no progress."

**Product goals**
| # | Goal | How we'll know (see §13) |
|---|---|---|
| G1 | Logging is fast enough to do every day | A saved meal logs in ≤ 3 taps; median meal log < 30 s |
| G2 | Users understand whether their current phase is working | Every phase shows a phase-specific progress read, with the reasoning |
| G3 | Numbers are trustworthy | Every food shows its source; every derived number says it's an estimate |
| G4 | Useful for free | All core logging, targets and weight tracking are free forever |

**Non-goals** — carried over from blueprint §12: no social feed or influencer content, no heavy gamification, no shame messaging, no crash diets or aggressive default deficits, no silent target changes, no AI estimates shown as verified data, no workout programming, no paywall on basic logging.

## 3. Users

**Primary:** strength-training adults who care about body composition — cutting, recomping, or lean bulking — and want real nutrient data.
**Secondary:** everyday calorie/macro trackers and people who just want to eat better, with no weight goal.

**Personas (for design decisions)**
- **Alex, 31, recomping.** Lifts 4×/week, weight flat for 6 weeks, assumes it isn't working. Needs Leanward to show waist down 2 cm and bench up 5 kg.
- **Maya, 27, first cut.** New to tracking. Needs a safe, sensible target and a diary that isn't a spreadsheet.
- **Sam, 45, nutrition-only.** No weight goal; wants to know if they get enough fiber, potassium and vitamin D.

**Eligibility [Proposed]:** 18+ only at launch (age confirmed at onboarding). This keeps calorie-deficit features away from minors and avoids extra App Store and privacy obligations.

## 4. Core concepts

These are the backbone of the data model (§11) and the UI. They come straight from blueprint §4.

| Concept | Meaning | Examples |
|---|---|---|
| **Goal** | What the user wants. Changes rarely. | Lose fat · Build muscle · Recomp · Maintain · Improve nutrition |
| **Phase** | The strategy being run *now*, with a start date, an optional planned end, and its own targets. A goal can span several phases. | Cut · Recomp · Lean bulk · Maintenance · Reverse diet · Nutrition optimization |
| **Target set** | A versioned set of daily targets (calories, macros, fiber, micronutrients) with an effective-from date. Each phase has one or more over time. | 2,160 kcal / 180 P / 60 F / 225 C from Nov 3 |
| **Intake** | What was actually logged. Nutrient values are snapshotted at log time, so later corrections to a food don't rewrite history (the user can choose to re-apply them). | — |
| **Measurement** | Weight, body-fat estimate, circumferences, strength entries. Each is tagged **measured**, **estimated**, or **derived**. | Scale weight = measured · smart-scale BF% = estimated · trend weight = derived |
| **Recommendation** | A suggested change (target or phase) with reasoning. Only takes effect after the user accepts it. | "Your loss rate is 0.2%/wk vs planned 0.5% — lower calories by 120?" |

**Goal → default phase mapping [Proposed]:** Lose fat → Cut · Build muscle → Lean bulk · Recomp → Recomp · Maintain → Maintenance · Improve nutrition → Nutrition optimization. The user can pick any phase for any goal (e.g. goal "Build muscle", current phase "Cut" before a bulk).

## 5. Release plan and scope

The blueprint's three-stage roadmap stays. This PRD fully specifies **Phase 1 (MVP)**; Phases 2–3 are listed so the architecture leaves room for them.

### 5.1 Changes to the blueprint's MVP [Proposed] — please confirm

| # | Change | Why |
|---|---|---|
| S1 | **Move waist measurement + simple strength entries into the MVP** (blueprint had measurements in Phase 2). | Recomp and lean bulk are MVP phases, but their success signals (blueprint §8) are waist and strength. Without them the app can't tell Alex his recomp is working — the core differentiator. |
| S2 | **MVP gets a basic phase progress read** (actual vs planned rate of weight change, waist and strength deltas), without adaptive TDEE. | Home must show "phase progress" (blueprint §11), and weekly check-ins / adaptive targets are Phase 2. |
| S3 | **Reverse diet moves to Phase 2.** | It depends on a credible maintenance estimate, which comes from the adaptive engine. |
| S4 | **No payments in the MVP.** Everything is free; the code has an entitlement check so premium can be switched on later. | Subscriptions add App Store setup, paywall UI and testing while there's nothing premium to sell yet. |
| S5 | **Micronutrients in the MVP show data coverage** ("vitamin D: data for 58% of today's calories"). | Branded foods often list only label nutrients. Showing coverage keeps the numbers honest (G3). |
| S6 | **Offline-first logging.** The diary works with no connection and syncs later. | Speed (G1) and the gym/kitchen reality. |

### 5.2 MVP (Phase 1) — in scope
Accounts and onboarding · goals and phases (Cut, Recomp, Lean bulk, Maintenance, Nutrition optimization) · target calculation (§8) with manual override · food search (generic + branded) · barcode scanning · quick add · custom foods · saved meals · copy meal/day · daily diary with meal slots · macros, fiber and micronutrients with coverage · weight logging with trend · waist + optional other circumferences · manual strength entries · basic progress charts · phase history · lb/kg and cm/in · cloud sync · data export and account deletion.

### 5.3 Phase 2 — Advanced nutrition
Recipe builder · advanced micronutrient reports · nutrition pattern insights (low protein/fiber/potassium, high sodium, intake consistency, planned vs actual) · weekly check-ins · adaptive TDEE and target recommendations (§8.6) · reverse diet · phase comparisons · progress photos · Apple Health incl. Apple Watch data (weight, active energy, workouts) · AI photo logging · voice logging · subscription/premium · advanced search (filters, "foods high in X").

### 5.4 Phase 3 — Body composition platform
Advanced adaptive model · Garmin · advanced body-composition analytics · training-performance integration · personalized insights · meal planning and grocery lists · advanced reporting · coach/dietitian sharing.

### 5.5 Out of scope (all phases)
See §2 non-goals. Also: Android at launch (the architecture must allow it later), web app, wearables beyond Apple Health/Garmin, medical or clinical use.

## 6. Feature requirements — MVP

Priority: **P0** = MVP can't ship without it · **P1** = MVP, can slip to a fast follow.

### 6.1 Onboarding and profile (ONB)
| ID | Requirement | Pri |
|---|---|---|
| ONB-1 | Sign up with **Sign in with Apple** or email + password; email verification; password reset. | P0 |
| ONB-2 | Collect: date of birth (18+ gate), sex used for calculation (male / female / prefer not to say — see §8.1), height, current weight, optional goal weight, activity level (5 described levels), training sessions/week. | P0 |
| ONB-3 | Optional: body-fat % estimate (with source: guess / smart scale / DEXA / calipers), waist circumference. | P0 |
| ONB-4 | Choose goal → app suggests a phase → user confirms or picks another. | P0 |
| ONB-5 | Choose rate of change where it applies (§8.3), defaulting to the moderate option, with the expected weekly change shown in the user's units. | P0 |
| ONB-6 | Optional dietary preferences/restrictions (vegetarian, vegan, dairy-free, etc.) stored for later filtering; no diet plans in MVP. | P1 |
| ONB-7 | Show the calculated targets **with the working** ("BMR 1,780 × activity 1.55 = 2,760 maintenance − 550 deficit = 2,210") and let the user edit any target before finishing. | P0 |
| ONB-8 | Onboarding takes ≤ 2 minutes with all optional steps skipped. | P0 |
| ONB-9 | Units: lb/kg, in/cm, kcal (kJ in Phase 2), chosen at onboarding and changeable later. | P0 |

### 6.2 Goals and phases (PHS)
| ID | Requirement | Pri |
|---|---|---|
| PHS-1 | Exactly one active phase at a time. Each phase stores type, start date, optional planned end date or target weight, rate setting, and its target-set history. | P0 |
| PHS-2 | Start a new phase at any time; the old phase is closed with an end date and kept in full (targets, dates, measurements). | P0 |
| PHS-3 | Changing the goal never deletes phases or history. | P0 |
| PHS-4 | Phase screen shows: current goal, current phase and day count (e.g. "Cut · day 23 of ~84"), current targets, phase progress read (§6.6), and phase history list. | P0 |
| PHS-5 | Edit targets mid-phase → creates a new target-set version effective today (or a chosen date); past days keep their old targets. | P0 |
| PHS-6 | Planned-end prompt: when a phase reaches its planned end or target weight, suggest next phases with a one-line rationale each; the user decides. | P1 |
| PHS-7 | Nutrition-optimization phase has no weight-change target and never shows deficit or surplus language. | P0 |

### 6.3 Food logging (LOG)
| ID | Requirement | Pri |
|---|---|---|
| LOG-1 | Diary by day with slots: Breakfast, Lunch, Dinner, Snacks, Beverages, Supplements. Slots can be renamed, hidden or reordered. | P0 |
| LOG-2 | Global **+** button reachable from every tab; the add sheet opens on **Recent / Frequent** with search focused. | P0 |
| LOG-3 | Search across generic, branded, custom foods and saved meals; results show name, brand, serving, calories, protein and a source badge (§7). | P0 |
| LOG-4 | Barcode scanning (UPC-A/E, EAN-8/13). Not found → offer "Create this food" with the barcode prefilled. | P0 |
| LOG-5 | Serving units: g, oz, ml, fl oz, cup, tbsp, tsp, item/piece, and the food's labelled servings; free numeric quantity (e.g. 1.5 cups). | P0 |
| LOG-6 | Raw vs cooked: generic foods show the preparation state in the name; search ranks the matching state first when the query says "cooked" or "raw". | P1 |
| LOG-7 | Quick add: calories only, or calories + P/C/F, with an optional label. | P0 |
| LOG-8 | Custom foods: name, brand, serving(s), calories, macros and any micronutrients from the label; optional barcode; private to the user. | P0 |
| LOG-9 | Saved meals: save any group of entries; log the whole meal in one tap; scale it (×0.5, ×2). | P0 |
| LOG-10 | Copy a meal or a whole day to another date; "repeat yesterday's breakfast" shortcut. | P0 |
| LOG-11 | Edit and delete entries; move an entry to another slot or day. | P0 |
| LOG-12 | Logging works offline; entries sync when back online, with no duplicates. | P0 |
| LOG-13 | Over-target days show neutral colors and copy (no red alarms, no "you failed"). | P0 |

### 6.4 Nutrition display (NUT)
| ID | Requirement | Pri |
|---|---|---|
| NUT-1 | Day view: calories consumed / remaining, protein, carbs, fat (consumed vs target), fiber. | P0 |
| NUT-2 | Detail view tracks: saturated, mono and poly fat, trans fat, sugar, added sugar, sodium, potassium, cholesterol, calcium, magnesium, iron, zinc, vitamins A, C, D, E, K, B1, B2, B3, B6, B12, folate, plus any other nutrient the source provides. | P0 |
| NUT-3 | Micronutrient targets default to the DRIs (RDA, or AI where no RDA exists) for the user's age and sex; values above the Tolerable Upper Intake Level are shown neutrally as "above UL". | P0 |
| NUT-4 | Every nutrient total shows data coverage when it's below 100% (S5). | P0 |
| NUT-5 | Food detail page shows the full nutrient panel per serving and per 100 g, plus source and verification status. | P0 |

### 6.5 Measurements (MEA)
| ID | Requirement | Pri |
|---|---|---|
| MEA-1 | Log weight (date/time, value, optional note); multiple weigh-ins a day allowed — the trend uses the first of the day by default. | P0 |
| MEA-2 | Trend weight and weekly average (§8.5) shown alongside the raw weigh-ins, labelled "trend (derived)". | P0 |
| MEA-3 | Circumferences: waist (P0); hips, chest, arm, thigh, neck (P1). The how-to-measure guidance is shown inline. | P0 |
| MEA-4 | Body-fat % entries with method (guess, smart scale, calipers, DEXA, other), always shown as "estimate". | P1 |
| MEA-5 | Strength entries **[Proposed]**: the user picks up to 5 "key lifts" and logs top set weight × reps; the app shows estimated 1RM (Epley) over time. No workouts, programs or set logging. | P0 |
| MEA-6 | All measurements can be edited and deleted, and are exportable. | P0 |

### 6.6 Progress (PRG)
| ID | Requirement | Pri |
|---|---|---|
| PRG-1 | Charts: weight (raw dots + trend line), waist, each key lift's estimated 1RM, average daily calories and protein vs target. Ranges: 4 weeks, 12 weeks, 6 months, all; phase boundaries drawn on every chart. | P0 |
| PRG-2 | **Phase progress read** — phase-specific signals, each shown as on track / watch / off track, with the numbers behind it. | P0 |
| | Cut: trend weight falling within ±50% of the planned rate; waist falling; key lifts within 5% of their phase-start estimated 1RM. | |
| | Recomp: trend weight within ±0.25%/wk of flat; waist flat or falling; key lifts rising. | |
| | Lean bulk: trend gain within ±50% of the planned rate; waist growth no faster than the user's limit (proposed default: 1 cm per kg gained); key lifts rising. | |
| | Maintenance: trend weight within ±1.5% of the phase-start weight; waist stable. | |
| | Nutrition optimization: logging consistency and nutrients meeting DRI (no weight signals). | |
| PRG-3 | A signal needs ≥ 14 days of phase data and ≥ 8 weigh-ins (or 2 waist / 2 lift entries); before that it shows "collecting data — x more days". | P0 |
| PRG-4 | Progress copy is plain and non-judgmental: "Weight flat, waist −1.8 cm, squat e1RM +4% — consistent with a successful recomp." | P0 |

### 6.7 Home (HOM)
| ID | Requirement | Pri |
|---|---|---|
| HOM-1 | Top of Home: calories remaining (ring or bar) with consumed/target, then P/C/F progress. | P0 |
| HOM-2 | Phase card: phase name, day count, single headline progress signal; tap → Phase tab. | P0 |
| HOM-3 | Quick log: the 5 most likely items for the current time slot (from history), each one tap to log. | P1 |
| HOM-4 | At most one daily insight card. MVP insight set: protein running low for the day, fiber below 50% of target by evening, no weigh-in for 7 days (gentle). | P1 |
| HOM-5 | No more than 4 cards on first load. Customization is Phase 2. | P0 |

### 6.8 Account, privacy and data (ACC)
| ID | Requirement | Pri |
|---|---|---|
| ACC-1 | In-app account deletion that removes all server data (App Store requirement). | P0 |
| ACC-2 | Export all data (diary, foods, measurements, phases, targets) as CSV and JSON. | P0 |
| ACC-3 | No ads. No sale or sharing of health or nutrition data with third parties; analytics are first-party and contain no food or body data. | P0 |
| ACC-4 | A support link to eating-disorder resources is available in Settings (National Alliance for Eating Disorders). | P0 |
| ACC-5 | Notifications are off by default; if enabled they're only reminders (log, weigh-in) — never shame or streak-loss messages. | P1 |

### 6.9 Navigation
Five tabs, per the blueprint: **Home · Diary · Progress · Phase · Profile**, plus the global **+** (LOG-2). Advanced nutrient detail lives one tap deeper (Diary → day → Nutrients) so the default views stay uncluttered.

## 7. Food data strategy [Proposed]

Blueprint §7 leaves sourcing open. Recommendation: a **hybrid stored in our own database**, rather than calling a third-party API on every search.

| Layer | Source | Why | Constraints |
|---|---|---|---|
| Generic foods (P0) | **USDA FoodData Central** — Foundation + SR Legacy (+ FNDDS for mixed dishes) | Deepest free micronutrient data; raw/cooked entries; public domain, CC0 | US-centric; names need cleanup for search |
| Branded + barcodes (P0) | **USDA Branded Foods** (has GTIN/UPC) | Same license; updated monthly | Label nutrients only — few micronutrients |
| Barcode fallback (P0) | **Open Food Facts** | Large crowd-sourced barcode coverage, commercial use allowed | ODbL: attribution required, and a public adapted database must be shared back; quality varies → badge "community" |
| User foods | Custom foods (private) | — | Never mixed into the shared catalog in MVP |
| Later option | Commercial API (e.g. fatsecret Premier, Nutritionix) | Wider brand/restaurant coverage | Paid; fatsecret's barcode lookup is a Premier-only method |

**Requirements**
- **FDB-1** Every food carries `source`, `source_id`, `verification` (verified / community / user / AI-estimate) and `last_updated`, shown as a badge.
- **FDB-2** Import USDA data via its bulk downloads on a schedule (monthly for branded), not through the live API, which defaults to 1,000 requests/hour.
- **FDB-3** Open Food Facts records live in their own table with attribution on every screen that shows them and in the legal page; any corrections we make to them are kept separable so share-alike obligations are easy to meet.
- **FDB-4** Duplicate handling: one canonical record per barcode; search collapses near-identical names; ranking puts verified before community and the user's own history first.
- **FDB-5** "Report a problem" on every food (wrong nutrients, wrong serving, duplicate). Reports are queued for review; the user can also fix it immediately by making a private copy.
- **FDB-6** Quality before quantity: community records missing calories or any macro are hidden from search.

Licensing basis: [FoodData Central API Guide](https://fdc.nal.usda.gov/api-guide) · [Open Food Facts ODbL summary](https://wiki.openfoodfacts.org/ODBL_License) · [fatsecret Platform editions](https://platform.fatsecret.com/api-editions). Re-check all terms before launch.

## 8. Calculations and logic

All numbers are estimates and the UI says so. Every formula below must be shown to the user in plain language somewhere (CLAUDE.md rule: no opaque scores). Values are working defaults to be confirmed during the prototype.

### 8.1 Energy expenditure (initial estimate)
- **BMR — Mifflin-St Jeor** (default): `10·kg + 6.25·cm − 5·age + 5` (male) / `− 161` (female). "Prefer not to say" uses the midpoint constant (−78).
- **BMR — Katch-McArdle** (offered when the user enters a body-fat % they trust): `370 + 21.6 · lean mass kg`.
- **Maintenance (TDEE)** = BMR × activity factor: Sedentary 1.2 · Lightly active 1.375 · Moderately active 1.55 · Very active 1.725 · Extremely active 1.9. Each level has a description that **includes** training ("desk job + 3–4 lifting sessions/week ≈ Moderately active") so training isn't double-counted.
- Training sessions/week is stored for protein defaults and the progress reads, not added on top of TDEE.

### 8.2 Safety floors and caps (apply to every phase)
- **Calorie floor:** target never below `max(BMR, 1,200 kcal female / 1,500 kcal male or unspecified)`. If the chosen rate would need less, the target is set at the floor and the app shows the slower expected rate.
- **Deficit cap:** ≤ 25% below maintenance.
- **Rate cap:** loss ≤ 1.0% of bodyweight/week; gain ≤ 0.5%/week. Faster options aren't offered.
- **Underweight guard:** if BMI < 18.5, Cut isn't offered, and a goal weight implying BMI < 18.5 isn't accepted; the copy suggests talking to a clinician.
- **Pregnancy/breastfeeding** (optional onboarding question): no deficit phases; nutrition-optimization or maintenance only, with a clinician note.
- Manual target edits **can** go below the calculated value but **not** below the floor.

### 8.3 Phase calorie targets
Energy-density assumption: **7,700 kcal per kg** (≈ 3,500 kcal per lb) of bodyweight change — a known simplification that the Phase 2 adaptive model corrects from real data.

| Phase | Rate options | Default | Daily target |
|---|---|---|---|
| Cut | 0.25 / 0.5 / 0.75 / 1.0 % BW per week | 0.5% | TDEE − (rate × kg × 7,700 ÷ 7), then floors/caps |
| Recomp | Maintenance, −5%, −10% | Maintenance | TDEE × (1 − x) |
| Lean bulk | 0.1 / 0.25 / 0.5 % BW per week | 0.25% | TDEE + (rate × kg × 7,700 ÷ 7), capped at +15% of TDEE |
| Maintenance | — | — | TDEE (shown as a ±100 kcal band) |
| Nutrition optimization | — | — | TDEE, labelled "estimated energy needs" |

### 8.4 Macro and fiber targets
- **Protein** (g per kg of *reference weight*; reference = current weight, or for BMI > 30 the weight at BMI 27.5 for the user's height, to avoid inflated targets):
  Cut 2.2 · Recomp 2.0 · Lean bulk 1.8 · Maintenance 1.6 · Nutrition optimization 1.2 — always ≥ 0.8 g/kg (RDA). Basis: Morton et al. 2018 (benefit plateaus near 1.6 g/kg, upper CI ≈ 2.2 g/kg) and Helms et al. 2014 (higher protein in a deficit for lean trained people).
- **Fat:** default 27% of calories; floor `max(20% of calories, 0.5 g/kg)`.
- **Carbohydrate:** the remainder after protein and fat; if this goes below 50 g, fat drops toward its floor first, then the user is told the protein target is crowding carbs.
- **Fiber:** 14 g per 1,000 kcal of target (Dietary Guidelines for Americans / IOM).
- Users may enter any macro split manually; the app warns (doesn't block) if protein < 0.8 g/kg or fat < 20%.

### 8.5 Weight trend
- **Trend weight:** exponentially weighted moving average of daily weights, α = 0.1 (the Hacker's Diet method); missing days are carried forward, not interpolated.
- **Weekly average:** mean of that calendar week's weigh-ins.
- **Rate of change:** slope of trend weight over the last 14 days, shown in units/week and %BW/week.

### 8.6 Adaptive expenditure (Phase 2 — specified now so the data model supports it)
- `TDEE_est = mean(daily intake) − (Δ trend kg × 7,700) ÷ days`, over a 21-day window, recomputed weekly.
- Only uses windows with ≥ 80% of days fully logged and ≥ 4 weigh-ins per week; otherwise it says "not enough data" and keeps the previous estimate.
- Blended with the previous estimate (e.g. 70/30) to damp noise; the change applied to targets is capped at ±150 kcal per week.
- Output is a **Recommendation** (§4) with the reasoning; targets change only when the user accepts it.

### 8.7 Strength
- Estimated 1RM (Epley): `weight × (1 + reps ÷ 30)`, only for sets of ≤ 12 reps; shown as "estimated".

## 9. UX principles

- **Premium and calm** — Oura / Whoop / Levels feel: dark-first, generous spacing, one accent color, numbers big and labels small. Visual identity is a separate decision (§15).
- **Fast paths first:** recent/frequent foods before search; one-tap saved meals; the keyboard opens on search.
- **Depth on demand:** micronutrients, formulas and data sources are one tap away, never on the default view.
- **Honest labels:** measured / estimated / derived; verified / community / user / AI-estimate.
- **Neutral tone:** no red "over" states, no streak shaming, no moralizing about foods.
- **Accessibility:** Dynamic Type, VoiceOver labels on charts (spoken summaries), 4.5:1 contrast, color never the only signal.

## 10. Non-functional requirements

| Area | Requirement |
|---|---|
| Performance | Cold start to Home < 2 s; search results < 300 ms for cached/recent and < 800 ms p95 from the server; barcode result < 1.5 s on scan |
| Offline | Diary, quick add, custom foods, recents and saved meals work offline; conflicts resolved last-write-wins per entry, with no data loss |
| Reliability | No logged entry is ever lost; sync is idempotent; crash-free sessions ≥ 99.5% |
| Security | TLS everywhere; row-level access control so users can only read their own rows; secrets never shipped in the app bundle |
| Privacy | Health data minimized and encrypted at rest; App Store privacy label accurate; Apple Health data (Phase 2) never used for ads or sold |
| Platform | iOS 17+ at launch; codebase can target Android later |
| Correctness | Calculation module is pure, versioned and unit-tested against hand-worked examples for every phase, floor and cap |

## 11. Data model (conceptual)

Goals and phases are separate entities (blueprint §16). Everything is history-preserving.

| Entity | Key fields |
|---|---|
| User / Profile | id, auth ids, DOB, sex-for-calc, height, units, activity level, training/week, preferences |
| Goal | id, user, type, created_at, ended_at |
| Phase | id, user, goal, type, start_date, end_date, planned_end / target_weight, rate setting, calc_version |
| TargetSet | id, phase, effective_from, kcal, protein, carbs, fat, fiber, micronutrient targets, origin (calculated / manual / recommendation), calc inputs snapshot |
| Food | id, source, source_id, verification, name, brand, barcode(s), nutrients per 100 g, servings[], last_updated |
| CustomFood | Food fields + owner |
| SavedMeal | id, owner, name, items[] (food, qty, unit) |
| DiaryEntry | id, user, date, slot, food ref, qty, unit, **nutrient snapshot**, logged_via (search / barcode / quick / meal / copy / AI), created/updated |
| WeightEntry | id, user, timestamp, value, source (manual / Health), note |
| MeasurementEntry | id, user, date, site (waist, hip…), value, method |
| BodyFatEntry | id, user, date, value, method |
| LiftEntry | id, user, date, lift, weight, reps, e1RM (derived) |
| Recommendation (P2) | id, user, phase, type, proposed change, reasoning, status (pending / accepted / declined), created/decided |
| FoodReport | id, food, user, issue type, note, status |

## 12. Technical approach [Proposed — decision pending, see §15]

- **App:** React Native + Expo + TypeScript. iPhone first, with a straight path to Android. It's also the stack you already know from PR Forge.
- **Backend:** Supabase (Postgres, auth incl. Sign in with Apple, row-level security, storage, edge functions). There's a free tier for development; costs scale with use.
- **Local data:** SQLite on device as the offline source of truth, syncing to Postgres.
- **Food search:** Postgres full-text + trigram search over the imported catalog; move to a dedicated search service only if needed.
- **Calculation engine:** a standalone TypeScript package with no UI dependencies, shared by app and server, heavily unit-tested.
- **Barcode:** the device camera via Expo's camera module.
- **Distribution:** TestFlight for testing. Needs an Apple Developer Program membership ($99/yr) before any device testing beyond Expo Go.

## 13. Success metrics

| Metric | MVP target |
|---|---|
| Time to log a saved/frequent meal (returning user) | ≤ 3 taps, median ≤ 5 s |
| Median time to log any meal | < 30 s |
| Search success (a result chosen within the first 5) | ≥ 80% |
| Barcode hit rate (US packaged foods) | ≥ 85% |
| Day-7 / day-30 retention | ≥ 40% / ≥ 20% (beta cohort) |
| Days with ≥ 2 meals logged, among active users | ≥ 70% |
| Weekly weigh-ins among users with a weight-change phase | ≥ 3 |
| Food reports per 1,000 logged entries | tracked, falling over time |

Instrumentation counts events only (e.g. "entry logged via barcode") — never food names or body data (ACC-3).

## 14. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Food data quality / coverage (esp. restaurants, non-US) | Users leave if search fails | Hybrid sources, verification badges, fast custom-food path, track search success; a commercial API is the fallback |
| Scope — the MVP is large for a solo build | Delays | Strict P0/P1; prototype first; cut P1s before slipping P0s |
| Health/safety misuse (very low intake) | User harm, App Store risk | §8.2 floors and caps, 18+, neutral tone, ED resource link |
| Open Food Facts share-alike | License non-compliance | Separate tables, attribution, keep corrections separable; legal review before launch |
| Backend cost and maintenance | Ongoing cost | Managed Supabase, monitor usage, no expensive per-search third-party calls |
| Name / trademark | Rename late | Run App Store, domain and USPTO checks before brand work |

## 15. Open questions — please answer

Each has my recommended default; "agree" is a fine answer.

1. **MVP scope changes S1–S6 (§5.1)** — accept all? *Recommend: yes.*
2. **Tech stack (§12)** — Expo/React Native + Supabase, or native Swift/SwiftUI? *Recommend: Expo + Supabase* (cross-platform later, matches your experience).
3. **Accounts** — require sign-in from day one (as the blueprint says), or allow local-only use with optional sign-in? *Recommend: required sign-in* — simpler sync and no data-migration edge cases.
4. **Food data (§7)** — USDA + Open Food Facts hybrid to start, with a commercial API evaluated later? *Recommend: yes.*
5. **Region** — US-only at launch (US food data, US DRIs, lb default)? *Recommend: yes.*
6. **Strength tracking (MEA-5)** — manual "key lifts" in the MVP OK? Should Leanward later read lifts from **PR Forge**, or only from Apple Health? *Recommend: manual now, decide integration in Phase 2.*
7. **Defaults in §8** — any you'd change? Especially: cut default 0.5%/wk, recomp default maintenance, lean-bulk default 0.25%/wk, protein 2.2 g/kg on a cut.
8. **Exercise calories** — confirm **not** added back to the food budget in the MVP (activity factor covers it), revisited with Apple Health in Phase 2. *Recommend: yes.*
9. **Age gate** — 18+ only? *Recommend: yes.*
10. **Monetization** — confirm the MVP ships with no paywall (S4) and the Phase 2 free/premium split follows blueprint §14. *Recommend: yes.*
11. **Progress photos** — Phase 2 OK, or do you want them in the MVP? *Recommend: Phase 2* (storage and privacy work).
12. **Visual identity** — do you have a direction, colors or a logo in mind, or should the prototype propose 2–3 directions? *Recommend: prototype proposes options.*

## 16. Feedback log

| Date | Version | Change |
|---|---|---|
| 2026-11-02 | 0.1 | First draft from Blueprint v2.0 |

## Appendix A — Calculation sources

- Mifflin MD, St Jeor ST, et al. *A new predictive equation for resting energy expenditure in healthy individuals.* Am J Clin Nutr. 1990.
- Katch-McArdle lean-mass BMR equation (McArdle, Katch & Katch, *Exercise Physiology*).
- Morton RW, et al. *A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength.* Br J Sports Med. 2018.
- Helms ER, Aragon AA, Fitschen PJ. *Evidence-based recommendations for natural bodybuilding contest preparation: nutrition and supplementation.* J Int Soc Sports Nutr. 2014.
- Institute of Medicine / National Academies — Dietary Reference Intakes (RDA, AI, UL); Dietary Guidelines for Americans (fiber 14 g/1,000 kcal).
- Walker J. *The Hacker's Diet* (exponentially smoothed trend weight).
- Epley B. *Poundage Chart* (1985) — estimated 1RM.
- Hall KD, et al. *Quantification of the effect of energy imbalance on bodyweight.* Lancet. 2011 — why 7,700 kcal/kg is only a starting approximation.

These citations are from established literature and are to be re-verified when the calculation engine is built.
