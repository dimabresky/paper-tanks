# Tasks: Paper Tanks (v1.4 field & table)

**Input**: Design documents from `specs/active/paper-tanks/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ws-protocol.md, quickstart.md

**Tests**: Included — constitution IV (rules + leak tests) and contracts/quickstart require them.

**Organization**: Existing LAN table stays; tasks are deltas. Grouped by user story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1–US7)
- Paths are repository-root relative

## Path Conventions

- Shared rules: `packages/shared/src/`
- Host room: `apps/server/src/`
- Vue client: `apps/client/src/`
- E2E: `e2e/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the existing three-package table; do not add a database or P2P stack

- [ ] T001 Confirm pnpm layout `apps/client`, `apps/server`, `packages/shared` matches plan.md (in-memory `Room.state` only; no DB)
- [ ] T002 Add `data-testid="status"` on the single current-step line in `apps/client/src/App.vue`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extend in-memory `MatchState` so stories can add scenery and stats without breaking join/place/fire

**⚠️ CRITICAL**: No user story work until this phase is complete

- [ ] T003 Extend `ShotResult` to `miss | hit | sunk | tree | crate` and add `Shot.cause` `fire | blast` (`fire` = player tap, `blast` = crate splash) in `packages/shared/src/types.ts`
- [ ] T004 Add `Decoration` `{ id, kind: tree | crate, cell, burned: boolean }` (`burned` trees only; cell empty of units and other decorations) and `Seat.decorations: Decoration[]` (empty until battle; cleared on rematch) in `packages/shared/src/types.ts`
- [ ] T005 Add `PlayerView.yourDecorations` in `packages/shared/src/types.ts` (battle/ended: own list; lobby/placement: `[]`)
- [ ] T006 Initialize `decorations: []` in `occupySeat` / rematch reset in `packages/shared/src/match.ts` (in-memory only)
- [ ] T007 [P] Set `cause: "fire"` on shots created by `applyFire` in `packages/shared/src/match.ts` so current miss/hit/sunk behavior is unchanged
- [ ] T008 Return `yourDecorations` from `getPlayerView` in `packages/shared/src/view.ts` (`[]` outside battle/ended; never emit opponent decoration cells except via `shotsYouFired`)
- [ ] T009 Compute `stats.fired` as count of own shots with `cause === "fire"`; `hits` as `hit|sunk`; `accuracy` as `fired === 0 ? 0 : round(hits / fired * 100)` in `packages/shared/src/view.ts`
- [ ] T010 Export `Decoration` from `packages/shared/src/index.ts`
- [ ] T011 Update `packages/shared/src/match.test.ts` and `packages/shared/src/view.test.ts` so existing place/fire/leak cases pass with `cause` and empty `decorations`

**Checkpoint**: Two players still join, place, fire, and win; `/api/host` still has no fleet JSON

---

## Phase 3: User Story 1 - Сесть за стол вдвоём (Priority: P1) 🎯 MVP

**Goal**: QR/host card only while a seat is free; waiting copy is one Russian line; LAN table unchanged (no P2P)

**Independent Test**: Two browsers join via `/`; after two seats `data-testid="host-panel"` is gone; third join still «Мест нет — уже двое за столом»

### Tests for User Story 1

- [ ] T012 [P] [US1] Assert `GET /api/host` body contains no fleet or decoration JSON in `e2e/match.spec.ts`

### Implementation for User Story 1

- [ ] T013 [US1] Render `HostPanel` only while `seatsTaken < 2` in `apps/client/src/App.vue` (`data-testid="host-panel"`)
- [ ] T014 [US1] Lobby waiting copy on `data-testid="status"` in `apps/client/src/App.vue` (one action: second player scans QR)
- [ ] T015 [US1] Keep preferred QR URL non-`169.254.0.0/16` in `apps/server/src/lan.ts`
- [ ] T044 [US1] Regression: disconnect in battle longer than 60 s without reconnect → remaining player wins with «Соперник вышел. Победа за тобой» in `apps/server/src/room.test.ts` (FR-020, SC-010; fake timers)
- [ ] T045 [US1] Regression: a third browser on the host URL occupies a free seat until two are taken; third is `ROOM_FULL` in `apps/server/src/room.test.ts` (FR-002, FR-005)

**Checkpoint**: Table join UX matches FR-016 host-card rule; fog of war unchanged

---

## Phase 4: User Story 2 - Расставить флот на своём листе (Priority: P1)

**Goal**: Auto and manual fleets stay valid; tank ink stays inside occupied cells (`x` 0–11, `y` 0–15; lengths `[4,3,3,2,2,2,1,1]`; no Moore touch)

**Independent Test**: «Расставить как получится» then inspect that hull/turret/barrel do not paint outside the unit’s cells or the sheet frame

### Implementation for User Story 2

- [ ] T016 [P] [US2] Redraw `apps/client/src/components/TankInk.vue` so hull, turret, and barrel stay inside the viewBox of occupied cells (no `overflow: visible`)
- [ ] T017 [US2] Set `overflow: hidden` on `.tank-origin` in `apps/client/src/components/PlacementBoard.vue`, `apps/client/src/components/BattleBoard.vue`, and `apps/client/src/styles.css`
- [ ] T018 [US2] Keep `validateFleet` constraints (orthogonal contiguous, in bounds, composition `[4,3,3,2,2,2,1,1]`, no Moore touch) in `packages/shared/src/fleet.ts` and `packages/shared/src/fleet.test.ts`

**Checkpoint**: Placement still rejects overlap; random fleet no longer visually overflows the grid

---

## Phase 5: User Story 3 - Стрелять по чужому листу (Priority: P1)

**Goal**: Cell tap still miss/hit/sunk with series-on-hit; extra results `tree`/`crate` come in US6 without a second client `fire` message

**Independent Test**: Two contexts still finish a match; repeat cell → «Уже стреляли сюда»; wrong turn → «Сейчас ход соперника»

### Tests for User Story 3

- [ ] T019 [P] [US3] Keep two-context match completion in `e2e/match.spec.ts` after Shot type changes

### Implementation for User Story 3

- [ ] T020 [US3] Document and enforce `CELL_TAKEN` for any prior attacker shot on that cell (including future `blast`) in `packages/shared/src/match.ts`
- [ ] T021 [US3] Map `lastShot` `miss`/`hit`/`sunk` to «мимо»/«ранен»/«убит» in `apps/client/src/components/BattleBoard.vue`

**Checkpoint**: Core battle loop still works; scenery not required yet

---

## Phase 6: User Story 4 - Тетрадная клетка и масштаб (Priority: P2)

**Goal**: Board shows only square cells; default cell ≥ 36px or scroll; pinch/+/- change `--cell-size`; taps hit `data-testid="cell"`

**Independent Test**: No lined ruling on `.board`; zoom does not retarget a neighboring cell

### Implementation for User Story 4

- [ ] T022 [US4] Remove lined+squared `repeating-linear-gradient` from covering `.board` in `apps/client/src/styles.css`; `.sheet` paper wash only; `.cell` square borders only
- [ ] T023 [US4] Add `--cell-size` (default ≥ 36px) and `.board-scroller { overflow: auto }` in `apps/client/src/styles.css` and `apps/client/src/components/GridBoard.vue`
- [ ] T024 [US4] Zoom controls (+/− and pinch) adjusting `--cell-size` between fit-sheet and ~2× default in `apps/client/src/components/GridBoard.vue` without CSS `transform` screenshot scaling
- [ ] T046 [US4] After changing `--cell-size`, a click on `data-testid="cell"` still matches that button’s `data-x`/`data-y` in `e2e/match.spec.ts` (SC-004)

**Checkpoint**: Field reads as notebook squares and is finger-targetable

---

## Phase 7: User Story 5 - Понимать, что делать сейчас (Priority: P2)

**Goal**: One Russian instruction per phase; full verb labels; technical host hints only while waiting for the second seat

**Independent Test**: New player can sit → place → fire using on-screen copy only; no QR card in battle

### Implementation for User Story 5

- [ ] T025 [P] [US5] Rename controls to «Повернуть», «Чужой лист», «Мой лист» in `apps/client/src/components/PlacementBoard.vue` and `apps/client/src/components/BattleBoard.vue`
- [ ] T026 [US5] Drive `data-testid="status"` from phase+turn in `apps/client/src/App.vue` (placement «Расставь танки и нажми Готов»; battle «Твой ход — укажи клетку на чужом листе» / «Сейчас ход соперника»)
- [ ] T027 [US5] Keep firewall/AP-isolation copy only on the waiting `HostPanel` in `apps/client/src/components/HostPanel.vue`
- [ ] T047 [US5] If a fire reply takes more than 3 s, `data-testid="status"` shows wait copy in `apps/client/src/App.vue` (plan performance; `firing` already exists in `useGame.ts`)

**Checkpoint**: UI reads as a table game, not a debug panel

---

## Phase 8: User Story 7 - Счёт, итог и ещё партия (Priority: P2)

**Goal**: Stats use `fired` = `cause === "fire"` and `hits` = `hit|sunk`; rematch same seats/nicks; decorations regenerate later in US6

**Independent Test**: Strip shows turn and tank counts without enemy positions; rematch returns to placement without a new QR

### Implementation for User Story 7

- [ ] T028 [US7] Stats strip: turn, `ты N — соперник M`, fired, accuracy%, last result in `apps/client/src/components/BattleBoard.vue` (`data-testid="stats"`)
- [ ] T029 [US7] Result screen winner, duration, both accuracies, shot map in `apps/client/src/components/ResultScreen.vue`
- [ ] T030 [US7] «Ещё партию» via existing `rematch` in `apps/client/src/components/ResultScreen.vue`; confirm `voteRematch` clears fleets and `decorations` in `packages/shared/src/match.ts`

**Checkpoint**: Match accounting works; lastShot can later show ёлка/ящик when US6 lands

---

## Phase 9: User Story 6 - Ёлки и ящики (Priority: P3)

**Goal**: On placement→battle, 5 trees + 2 crates per seat; own sheet shows them; enemy hidden until opened; tree burns statically; crate blasts 2–4 Moore neighbors without chain crates

**Independent Test**: Shared tests for placement, fire outcomes, and view leaks; UI shows ink trees/crates and burning tree without fire animation

### Tests for User Story 6 ⚠️

> Write these FIRST and ensure they FAIL before implementation

- [ ] T031 [P] [US6] Failing tests: `placeDecorations` yields 5 trees + 2 crates, never on unit cells, may be Moore-adjacent to tanks, no decoration overlap in `packages/shared/src/decorations.test.ts`
- [ ] T032 [P] [US6] Failing tests: `applyFire` on tree → `result: "tree"`, turn passes; crate → 2–4 in-bounds unopened Moore `blast` shots; nested crate reveals without re-blast; turn kept iff any `hit`/`sunk` in `packages/shared/src/match.test.ts`
- [ ] T033 [P] [US6] Failing leak test: opponent decoration `${x}:${y}` absent from `getPlayerView` until that cell is in `shotsYouFired` in `packages/shared/src/view.test.ts`

### Implementation for User Story 6

- [ ] T034 [US6] Implement `placeDecorations(fleet, rng)` (7 cells, retry on collision, never on unit cells) in `packages/shared/src/decorations.ts` and export it from `packages/shared/src/index.ts`
- [ ] T035 [US6] Call `placeDecorations` for both seats on placement→battle in `setReady` in `packages/shared/src/match.ts`; `burned: false`
- [ ] T036 [US6] Extend `applyFire` in `packages/shared/src/match.ts`: empty→miss; tree→`burned` + `tree` + pass turn; crate→2–4 `blast`; blast crate→`crate` no nested blast; `CELL_TAKEN` if attacker already opened the cell
- [ ] T037 [US6] Project `yourDecorations` and burned trees in `packages/shared/src/view.ts`; strip `sunkUnitId` from public shots if unused by UI
- [ ] T038 [P] [US6] Add static ink `TreeInk.vue`, `CrateInk.vue`, `BurningTreeInk.vue` (no fire animation) in `apps/client/src/components/`
- [ ] T039 [US6] Draw own decorations and revealed enemy tree/crate/blast marks in `apps/client/src/components/BattleBoard.vue`
- [ ] T040 [US6] Map `lastShot` `tree`/`crate` to «ёлка»/«ящик» in `apps/client/src/components/BattleBoard.vue`

**Checkpoint**: Scenery is server-authored and hidden from the opponent until shot

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Quickstart gate and docs; no P2P, no persistence

- [ ] T041 [P] Align `README.md` with squared grid, zoom, trees/crates, and PC-as-table (no phone P2P)
- [ ] T042 [P] `pnpm typecheck` after `PlayerView` / `Shot` changes
- [ ] T043 Run `pnpm test` and `pnpm test:e2e` per `specs/active/paper-tanks/quickstart.md` (includes SC-008: match still playable after host WAN is down once both have joined — manual note in README via T041)

Analyze follow-ups (IDs continue after T043 so existing IDs stay stable): T044–T045 in US1, T046 in US4, T047 in US5.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Immediate
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all stories
- **US1, US2, US3 (P1)**: After Foundational; can proceed sequentially or in parallel if files do not collide
- **US4, US5, US7 (P2)**: After P1 recommended (US5 shares `App.vue`/`HostPanel` with US1; US7 shares `BattleBoard` with US3)
- **US6 (P3)**: After Foundational; needs US3 fire loop; lastShot labels complete US7
- **Polish**: After desired stories

### User Story Dependencies

- **US1**: After Phase 2 — HostPanel/`App.vue`
- **US2**: After Phase 2 — TankInk/CSS; independent of US1
- **US3**: After Phase 2 — match/BattleBoard; independent of US2
- **US4**: GridBoard/styles; avoid overlapping US2 CSS on `.tank-origin`
- **US5**: After US1 for HostPanel hide; copy on `status`
- **US7**: After US3; tree/crate lastShot text completed in US6 T040
- **US6**: After Phase 2 + US3 `CELL_TAKEN` rule; independent of zoom

### Within Each User Story

- Tests (US6) MUST fail before implementation
- Types/models before `setReady`/`applyFire`
- Shared engine before Vue drawings
- Story complete before the next priority when files overlap

### Parallel Opportunities

- T007 and T008 after T003–T006
- T016 (TankInk) parallel with T013 (HostPanel) — different files
- T031, T032, T033 together
- T038 ink components parallel after T037 view exists
- T041 and T042 in polish

---

## Parallel Example: User Story 6

```bash
Task: "Failing placeDecorations tests in packages/shared/src/decorations.test.ts"
Task: "Failing applyFire tree/crate tests in packages/shared/src/match.test.ts"
Task: "Failing decoration leak tests in packages/shared/src/view.test.ts"
```

---

## Parallel Example: P1 after foundation

```bash
Task: "HostPanel visibility in apps/client/src/App.vue"
Task: "TankInk viewBox in apps/client/src/components/TankInk.vue"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 Setup
2. Phase 2 Foundational (types + view stats; in-memory only)
3. Phase 3 US1 (hide QR, status, host leak e2e)
4. **STOP**: two phones still sit at the PC table

### Incremental Delivery

1. Setup + Foundational → types compile, old tests green
2. US1 → join UX
3. US2 → tanks stay in cells
4. US3 → fire regression
5. US4 → square grid + zoom
6. US5 → copy
7. US7 → stats/rematch
8. US6 → trees/crates (largest rules change)
9. Polish → quickstart commands

### Parallel Team Strategy

After Phase 2: A = US1+US5 (`App.vue`), B = US2+US4 (grid/CSS), C = US3+US7+US6 (`packages/shared` then BattleBoard)

---

## Notes

- [P] = different files, no unfinished dependencies
- Storage remains `Room.state` in RAM — no tasks for disk/DB
- Do not add WebRTC or a second room
- Commit after each task or logical group (on `feat/` from `dev` per constitution, not in this command)
- Existing `specs/active/paper-tanks/tasks.md` is the v1.4 list plus analyze follow-ups T044–T047
- `placeDecorations` lives only in `packages/shared/src/decorations.ts`
