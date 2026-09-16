# Tasks: Крупнее лист, фигурки танков, сильнее гарь

**Input**: Design documents from `specs/001-dense-field-placement/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included — constitution IV (rectangle fleet + leak) and `contracts/ws-protocol.md` / `quickstart.md` require them.

**Organization**: Delta on the existing LAN table. Grouped by user story.

**Git for implement**: from latest `dev` → `feat/dense-field-placement` (not this command).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US4 from spec.md
- Paths are repository-root relative

## Path Conventions

- Shared rules: `packages/shared/src/`
- Host room: `apps/server/src/`
- Vue client: `apps/client/src/`
- E2E: `e2e/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Stay on the three-package table; do not add packages, DB, or P2P

- [X] T001 Confirm pnpm layout `apps/client`, `apps/server`, `packages/shared` matches plan.md (in-memory `Room.state` only; no new realtime stack)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 16×22 sheet, rectangle fleet (`Unit.width`), validation, auto-place, leak JSON — before any story UI

**⚠️ CRITICAL**: No user story work until this phase is complete. After this, length-tap placement of a 1×4 line is `BAD_FLEET`; use auto-place until US2.

- [X] T002 Set `COLS = 16`, `ROWS = 22`, `COL_LETTERS = "АБВГДЕЖЗИЙКЛМНОП"` (`x` 0–15, `y` 0–21, row labels 1–22) in `packages/shared/src/constants.ts`
- [X] T003 Add `width: 1 | 2` on `Unit` in `packages/shared/src/types.ts` (`width` **2** iff `length` is 3 or 4; **1** iff `length` is 1 or 2; `cells.length === length * width`)
- [X] T004 Export `FLEET_SHAPES` (one `{ length: 4, width: 2 }`, two `{ 3, 2 }`, three `{ 2, 1 }`, two `{ 1, 1 }` — 28 cells) from `packages/shared/src/constants.ts`
- [X] T005 Implement `cellsForRect(origin, length, width, horizontal)` (filled orthogonal rectangle; long axis = length) and rectangle check (`isOrthogonalRectangle`) in `packages/shared/src/fleet.ts`
- [X] T006 Change `validateFleet` in `packages/shared/src/fleet.ts` to require the `FLEET_SHAPES` multiset, unique ids, rectangles, in-bounds, Moore-8 no-touch (keep Russian `BAD_FLEET` copy)
- [X] T007 Implement `rotateUnit(unit)` in `packages/shared/src/fleet.ts` (2×4 ↔ 4×2 around bounding-box centre, snap origin to integer cells; return `null` if out of bounds or Moore-touch)
- [X] T008 Update `randomValidFleet` / `tryPlace` in `packages/shared/src/fleet.ts` to place `FLEET_SHAPES` rectangles (not 1-wide lines)
- [X] T009 Export `FLEET_SHAPES`, `cellsForRect`, `rotateUnit`, and `Unit.width` from `packages/shared/src/index.ts`
- [X] T010 Rewrite `packages/shared/src/fleet.test.ts`: accept 28-cell `FLEET_SHAPES` fleet; reject old 1×4 line as the “four”; `rotateUnit` swaps 2×4 ↔ 4×2; Moore gap; `randomValidFleet` ≥ 20 successes on 16×22
- [X] T011 Replace `cellsForAnchor` line fixtures with `cellsForRect` + `width` in `packages/shared/src/match.test.ts`, `packages/shared/src/view.test.ts`, `packages/shared/src/decorations.test.ts` (leave 2 rows between 2-wide hulls). In `match.test.ts` add FR-016: fire **one** cell of a 2×4 → `hit` (not `sunk`), turn kept; after the other seven cells of that unit are opened → `sunk`. In `decorations.test.ts` keep FR-013: `placeDecorations` on the 16×22 rectangle fleet yields **5 trees + 2 crates**, never on unit cells, no decoration overlap; unrevealed opponent décor still absent from `getPlayerView` (existing leak case in `view.test.ts`)
- [X] T012 Assert `getPlayerView` after **one** hit on B’s 2×4 does not serialize the other seven cell keys of that unit in `packages/shared/src/view.test.ts` (FR-015)
- [X] T013 Update `12 * 16` / `x % 12` fixtures to 16×22 in `apps/server/src/room.test.ts`

**Checkpoint**: `pnpm test` green; `place` of eight rectangles + fire/sunk on all cells of a 2×4 still works; `/api/host` still has no fleet JSON

---

## Phase 3: User Story 1 - Видеть больше поля при мелкой клетке (Priority: P1) 🎯 MVP slice

**Goal**: Sheet is 16×22; default cell ~22px so a ~360px phone shows more cells than the old 36px / 12-wide grid; pinch and «+»/«−» remain; taps hit the visible cell

**Independent Test**: Placement and battle show 16 letter headers (А–П) and 22 row numbers; default zoom is smaller than 36px; zoom-in still fires/places the cell under the finger. Manual length chips may be broken until US2 — use «Расставить как получится».

### Tests for User Story 1

- [X] T014 [P] [US1] Assert Playwright sees 16×22 `data-testid="cell"` buttons and zoom still maps the tap to `data-x`/`data-y` in `e2e/match.spec.ts`

### Implementation for User Story 1

- [X] T015 [US1] Set default `--cell-size: 22px` in `apps/client/src/styles.css`; GridBoard `DEFAULT_CELL = 22`, min zoom = fit all 16 columns, max still finger-sized (~56–72px) in `apps/client/src/components/GridBoard.vue` (cells stay `<button>`; no `transform: scale` screenshot)
- [X] T016 [P] [US1] Render `COLS * ROWS` dots (not `COLS * 16`) in `apps/client/src/components/ShotMap.vue`
- [X] T017 [US1] Keep two-finger pinch and empty-cell pan on `.board-scroller` in `apps/client/src/components/GridBoard.vue` (do not set `touch-action: none` on the whole scroller)

**Checkpoint**: Bigger notebook is visible; auto-place + battle still playable; hit-testing honest

---

## Phase 4: User Story 2 - Расставлять флот фигурками с перетаскиванием (Priority: P1)

**Goal**: Tray of eight tank toys; drag onto the sheet with full-rectangle ghost; pan from empty cells; rotate only the selected placed tank; auto-place still works

**Independent Test**: Drag all eight tokens to valid cells, rotate via tap + «Повернуть», return one to tray, auto-place then drag; empty-cell drag pans the sheet

### Tests for User Story 2

- [X] T018 [US2] Playwright: drag `data-testid="tank-token"` onto the grid, ghost commit, `data-testid="rotate"` after selecting `data-testid="placed-tank"` in `e2e/match.spec.ts` (see `contracts/placement-ui.md`)

### Implementation for User Story 2

- [X] T019 [US2] Add `PlacementTray.vue` in `apps/client/src/components/PlacementTray.vue` (`data-testid="placement-tray"`; tokens `data-testid="tank-token"` + `data-shape` in `{2x4,2x3,1x2,1x1}`)
- [X] T020 [US2] Replace length-chip tap placement in `apps/client/src/components/PlacementBoard.vue` with pointer-capture drag from tray/placed tank (`touch-action: none` on the token only); grab-offset ghost = `cellsForRect`; drop commits or reverts last valid `units`
- [X] T021 [US2] Empty-cell / two-finger gestures still pan/zoom the sheet (do not `preventDefault` pan when the pointer did not start on a tank) in `apps/client/src/components/PlacementBoard.vue` and `apps/client/src/components/GridBoard.vue`
- [X] T022 [US2] Select placed unit (`data-testid="placed-tank"` + `data-unit-id`); «Повернуть» `data-testid="rotate"` calls `rotateUnit` only for that id; no-op + status if none selected in `apps/client/src/components/PlacementBoard.vue`
- [X] T023 [US2] Drop on tray removes the unit; drop off-sheet otherwise restores last valid cells in `apps/client/src/components/PlacementBoard.vue`
- [X] T024 [US2] Status copy «Перетащи танки на лист» / «Тапни танк и нажми Повернуть» on `data-testid="status"` in `apps/client/src/App.vue`; remove hint «Выбери длину, тапни якорь»
- [X] T025 [US2] Keep `data-testid="random-fleet"` filling a valid 28-cell fleet and allow drag/rotate afterward in `apps/client/src/components/PlacementBoard.vue`

**Checkpoint**: Manual placement matches US2; `place` payload is eight rectangles

---

## Phase 5: User Story 3 - Читать танки как модели (Priority: P2)

**Goal**: Richer ink filling the rectangle; tray standing pose vs board top-down; enemy wounded cells use a stamp, full hull only when sunk

**Independent Test**: 2×4/2×3 look like tanks not 1-wide strips; one enemy hit does not reveal the rest of the hull; sunk unit shows the full model inside its cells

### Implementation for User Story 3

- [X] T026 [US3] Keep only `PlayerView` in `apps/client/src/composables/useGame.ts` and `apps/client/src/components/BattleBoard.vue`: no opponent `fleet` cache; a single enemy `hit` MUST NOT assemble a 2×N hull (stamp until sunk, FR-010 / FR-017)
- [X] T027 [US3] Redraw `TankInk` in `apps/client/src/components/TankInk.vue` for a 2D viewBox (`length × width` cells, hull/turret/tracks inside, `overflow: hidden`); prop `pose: "board" | "tray"`
- [X] T028 [US3] Span placed/own tanks by bounding box (`width%` × `height%` from cell counts, not `length` only) in `apps/client/src/components/PlacementBoard.vue` and `apps/client/src/components/BattleBoard.vue`
- [X] T029 [P] [US3] Add `WoundInk.vue` in `apps/client/src/components/WoundInk.vue` (same stamp every opened cell)
- [X] T030 [US3] On enemy sheet, draw `WoundInk` for `hit` cells until the unit is sunk; draw full `TankInk` only when all of that unit’s cells appear in opened shots (never read opponent fleet) in `apps/client/src/components/BattleBoard.vue`

**Checkpoint**: Own sheet shows models; fog does not leak 2×N from one wound

---

## Phase 6: User Story 4 - Сильнее гарь ёлки и ящика (Priority: P2)

**Goal**: Static but stronger burn/detonation drawings; shot rules unchanged (5 trees, 2 crates, 2–4 blast)

**Independent Test**: Opened tree ≠ intact tree; opened crate ≠ intact crate; no CSS fire animation; miss still looks like miss

### Implementation for User Story 4

- [X] T031 [P] [US4] Strengthen static `BurningTreeInk` (smoke/contrast, no animation) in `apps/client/src/components/BurningTreeInk.vue`
- [X] T032 [P] [US4] Add or replace opened-crate drawing (`OpenedCrateInk.vue` or burned `CrateInk`) in `apps/client/src/components/` — burst/hot crate, still blue/brown pen
- [X] T033 [US4] Use the new burn/open SVGs on own decorations and opened enemy cells in `apps/client/src/components/BattleBoard.vue`

**Checkpoint**: Ёлка/ящик readable on a 22px cell; constitution V (no arcade flame)

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Docs, remaining 12×16 strings, full checks

- [X] T034 [P] Update README sheet size, fleet 2×4/2×3, drag placement in `README.md`
- [X] T035 [P] Keep the increment pointer at the top of `specs/active/paper-tanks/spec.md` (link to `specs/001-dense-field-placement/spec.md` for 16×22 / 28 cells / drag). Update leftover `12×16` / 18-cell comments in `packages/shared/src/` so they are not the only stated sheet size. Do not rewrite the whole v1.5 body.
- [X] T036 Run `pnpm test`, `pnpm typecheck`, `pnpm test:e2e` per `specs/001-dense-field-placement/quickstart.md`

**Checkpoint**: Quickstart scenarios pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Immediate
- **Foundational (Phase 2)**: After Setup — **BLOCKS** all stories
- **US1 (Phase 3)**: After Foundational; auto-place for play
- **US2 (Phase 4)**: After Foundational; needed for a complete playable MVP (manual place)
- **US3 (Phase 5)**: After US2 (shares PlacementBoard / TankInk)
- **US4 (Phase 6)**: After Foundational; BattleBoard wiring after US3 if both edit `BattleBoard.vue`
- **Polish**: After desired stories

### User Story Dependencies

- **US1**: Grid/zoom only; play via auto-place
- **US2**: Needs rectangle `place`; independent of burn art
- **US3**: Needs drag/select layout; independent of crate SVG
- **US4**: Ink files [P]; BattleBoard after US3 to avoid a merge conflict

### Parallel Opportunities

- T014 ∥ T016 (e2e vs ShotMap)
- T031 ∥ T032 (tree vs crate SVG)
- T034 ∥ T035 (docs)

---

## Parallel Example: User Story 4

```bash
Task: "Strengthen BurningTreeInk in apps/client/src/components/BurningTreeInk.vue"
Task: "Opened crate SVG in apps/client/src/components/OpenedCrateInk.vue"
```

---

## Implementation Strategy

### MVP (US1 + US2)

1. Phase 1–2 (constants + rectangle fleet + leak JSON)
2. Phase 3 US1 (16×22, 22px, zoom)
3. Phase 4 US2 (tray drag + rotate)
4. **STOP**: two phones can place and fight on the new sheet

### Incremental

5. US3 models + wound stamp
6. US4 stronger burn
7. Polish / quickstart

### Parallel Team

After Phase 2: A = US1+US2, B = US4 SVGs, then merge BattleBoard once.

---

## Notes

- [P] = different files, no unfinished dependency
- Do not send opponent fleet to the client “for convenience”
- `fire` stays one cell; blast rules unchanged
- Commit in English Conventional Commits after logical groups
