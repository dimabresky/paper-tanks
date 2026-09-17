# Tasks: Больше ёлок и ящиков на листе

**Input**: Design documents from `specs/002-more-trees-crates/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included — constitution IV; spec SC-001–SC-004; `contracts/ws-protocol.md` / `quickstart.md` require count + leak + fire checks.

**Organization**: Count-only delta on the existing LAN table. Grouped by user story.

**Git for implement**: from latest `dev` → `feat/more-trees-crates` (not this command). Speckit id `002-more-trees-crates` is the feature directory, not the git branch.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US2 from spec.md
- Paths are repository-root relative

## Path Conventions

- Shared rules: `packages/shared/src/`
- Host room: `apps/server/src/` (no change expected)
- Vue client: `apps/client/src/` (no hardcoded counts)
- E2E: `e2e/` (optional; counts covered in Vitest)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Stay on the three-package table; do not add packages, DB, or P2P

- [X] T001 Confirm pnpm layout `apps/client`, `apps/server`, `packages/shared` matches `specs/002-more-trees-crates/plan.md` (in-memory `Room.state` only; no new realtime stack)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Host already places décor on `ready` / rematch; this increment only changes counts

**⚠️ CRITICAL**: No user story work until this phase is complete

- [X] T002 Confirm `setReady` in `packages/shared/src/match.ts` already assigns `placeDecorations` to both seats when battle starts, and rematch clears `Seat.decorations` then waits for a new `ready` (no new WS types, no client-side generation)

**Checkpoint**: Wiring is already there; story work is constants + tests only

---

## Phase 3: User Story 1 - Видеть гуще ёлки и ящики на своём листе (Priority: P1) 🎯 MVP

**Goal**: After both fleets are accepted, each sheet has **10 trees + 4 crates** (14 cells) on empty cells; own sheet shows all; opponent unrevealed décor stays out of `getPlayerView`

**Independent Test**: After both ready, each seat has exactly 10 `kind: "tree"` and 4 `kind: "crate"`; own `yourDecorations` lists all 14; JSON of the other seat’s unrevealed décor coordinates is absent

### Tests for User Story 1

> Write these FIRST; they MUST fail on current `TREE_COUNT = 5` / `CRATE_COUNT = 2`

- [X] T003 [P] [US1] In `packages/shared/src/decorations.test.ts` assert `placeDecorations` on the 16×22 rectangle fleet yields **10 trees + 4 crates**, `decorations.length === 14`; `kind` multiset is 10 `tree` + 4 `crate`; `cell` in bounds, not on any unit cell, unique among decorations of that seat; `burned === false`; Moore-adjacent to tanks allowed; run at least 10 RNG seeds (SC-001); `placeDecorations` MUST return length 14 or throw
- [X] T004 [P] [US1] In `packages/shared/src/view.test.ts` after `setReady` (do **not** wipe `seats.*.decorations`): `getPlayerView(state, "a").yourDecorations` has 10 `tree` + 4 `crate`; `JSON.stringify(getPlayerView(state, "a"))` MUST NOT contain coordinates of B’s **unrevealed** decoration cells (keep existing `hidden-tree` leak case)
- [X] T005 [P] [US1] In `packages/shared/src/match.test.ts` after rematch clears décor, both `place` + `ready` again: each seat has 14 decorations, 10 tree + 4 crate, not leftover cells/ids from the previous party (FR-005 / SC-004)

### Implementation for User Story 1

- [X] T006 [US1] In `packages/shared/src/decorations.ts` set `TREE_COUNT = 10`, `CRATE_COUNT = 4`; keep `DECORATION_COUNT = TREE_COUNT + CRATE_COUNT` (14); keep the 200-attempt shuffle-and-slice; ids unique per seat (e.g. `tree-0` … `crate-13`); kinds **10 tree + 4 crate**; `placeDecorations(fleet)` MUST return length 14 with those kinds or throw (must not start battle with a short list)
- [X] T007 [P] [US1] Confirm `apps/client/src/components/BattleBoard.vue` draws every `yourDecorations` item (no hardcoded 5 / 2 / 7); no new Russian copy

**Checkpoint**: Own sheet is denser; fog of unrevealed opponent décor still holds; rematch regenerates 10+4

---

## Phase 4: User Story 2 - Стрелять по ёлке и ящику как раньше (Priority: P1)

**Goal**: Tree still burns and passes the turn; crate still blasts 2–4 unopened Moore cells without chaining; tank cell in the blast keeps the series. Formula unchanged — only encounter rate goes up.

**Independent Test**: Existing tree/crate/blast tests in `packages/shared/src/match.test.ts` still pass; `applyFire` / blast size not rewritten

### Tests for User Story 2

- [X] T008 [US2] Keep (do not weaken) `packages/shared/src/match.test.ts` cases: tree opens, marks `burned`, passes turn; crate blasts **2–4** unopened Moore cells, nested crate opens without a new blast; series kept if a tank cell is opened. Do **not** add a 10-shot loop — SC-003 «10» is acceptance sample size; these fixtures cover the rule (FR-003 / FR-004)

### Implementation for User Story 2

- [X] T009 [US2] Do **not** change `applyFire` / blast selection in `packages/shared/src/match.ts` or `mooreNeighbors` in `packages/shared/src/decorations.ts`; do **not** change fog projection in `packages/shared/src/view.ts` beyond listing all own décor already; do **not** edit `COLS` / `ROWS` / `FLEET_SHAPES` in `packages/shared/src/constants.ts` or win / tank-touch logic in `packages/shared/src/match.ts` / `packages/shared/src/fleet.ts` (FR-006)
- [X] T010 [P] [US2] Confirm `apps/client/src/components/BattleBoard.vue` still uses static `BurningTreeInk` / crate ink (no fire animation) for opened tree/crate cells

**Checkpoint**: Denser sheet; same shot rules

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Canon numbers and validation after both stories

- [X] T011 [P] Replace 5+2 with **10 ёлок и 4 ящика** in `specs/active/paper-tanks/spec.md` (US6 / FR-013 / SC-006); bump revision (this increment replaces those numbers)
- [X] T012 [P] Set per-seat battle décor to 10 trees + 4 crates in `specs/active/paper-tanks/data-model.md`
- [X] T013 [P] Align `specs/active/paper-tanks/plan.md`, `specs/active/paper-tanks/research.md`, and `specs/active/paper-tanks/quickstart.md` to 10+4 (do not rewrite `specs/001-dense-field-placement/` history)
- [X] T014 Run `specs/002-more-trees-crates/quickstart.md`: `npx pnpm@10 --filter @paper-tanks/shared test` and `npx pnpm@10 typecheck` (tree/crate fire + leak still green; sheet still 16×22, fleet still `FLEET_SHAPES`, win unchanged — FR-006)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS user stories
- **User Story 1 (Phase 3)**: Depends on Foundational; tests T003–T005 before T006
- **User Story 2 (Phase 4)**: Depends on Foundational; can run after US1 constants land (fire tests do not depend on total count, but implement sequentially to avoid mixing diffs)
- **Polish (Phase 5)**: After US1 + US2

### User Story Dependencies

- **User Story 1 (P1)**: After Phase 2 — MVP (counts + fog + rematch)
- **User Story 2 (P1)**: After Phase 2 — verification that fire/fog code is untouched; independently testable via existing `match.test.ts`

### Within Each User Story

- Tests MUST be written and FAIL before T006
- Constants before relying on UI
- Do not edit `applyFire` to “make counts work”

### Parallel Opportunities

- T003, T004, T005 (different test files)
- T007 with T006 (different files)
- T010 with T009 (different files)
- T011, T012, T013 (different spec files)

---

## Parallel Example: User Story 1

```text
Task: "T003 decorations.test.ts expects 10 trees + 4 crates, length 14"
Task: "T004 view.test.ts yourDecorations 10+4 and leak JSON"
Task: "T005 match.test.ts rematch then ready again yields 10+4"
```

Then T006 constants in `packages/shared/src/decorations.ts`.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 + Phase 2
2. Failing tests T003–T005
3. T006 constants
4. **STOP and VALIDATE**: 10+4 per sheet, leak test green
5. US2 is confirm-only; polish updates active canon

### Incremental Delivery

1. Setup + Foundational
2. US1 → denser own sheet (MVP)
3. US2 → confirm shot rules
4. Polish → active spec 10+4

### Parallel Team Strategy

One person: sequential T001 → T014. Two people: A writes T003–T005, B prepares T006 after tests exist; do not both edit `decorations.ts`.

---

## Notes

- [P] = different files, no incomplete-task coupling
- Do not add WebSocket messages or `/api/host` décor
- Do not implement on `main`/`dev`; wait for `/speckit-implement` on `feat/more-trees-crates`
- Avoid: client-side décor RNG, changing 2–4 blast, rewriting `specs/001-dense-field-placement/` (shipped history; living 10+4 canon is `specs/active/paper-tanks`)
