# Implementation Plan: Крупнее лист, фигурки танков, сильнее гарь

**Branch**: `001-dense-field-placement` (feature directory) | **Date**: 2026-09-16 | **Spec**: [spec.md](./spec.md)

**Git for implement**: constitution workflow — from latest `dev` create `feat/dense-field-placement`. The speckit id is not the git branch.

**Input**: Feature specification from `specs/001-dense-field-placement/spec.md` (v0.7)

**Note**: Filled by `/speckit-plan`. Evolution of the existing LAN table, not a greenfield app.

## Summary

Keep the LAN host and `getPlayerView`. Grow the sheet to **16×22**, shrink default cell size, make long tanks **2×4 / 2×3** rectangles, replace length-tap placement with **drag figurines + ghost preview**, rotate only the **selected** unit, draw richer tank and burn ink, and show **enemy wounded cells as a non-leaking stamp** until the unit is sunk.

## Technical Context

**Language/Version**: TypeScript 5.9, Node.js ≥ 22.12

**Primary Dependencies**: Vue 3.5, Vite 7, `ws` ^8, `qrcode`, pnpm workspaces (`apps/client`, `apps/server`, `packages/shared`)

**Storage**: In-memory `MatchState` (no database)

**Testing**: Vitest (shared + server), Playwright (two browser contexts)

**Target Platform**: Host macOS/Linux/Windows with Node; players in Safari iOS / Chrome Android / desktop Chrome via LAN HTTP

**Project Type**: Local web table (static client + authoritative room on the same port)

**Performance Goals**: Placement drag at 60 fps on a phone; shot round-trip unchanged (LAN)

**Constraints**: No accounts, no P2P; fog of war in `getPlayerView`; Russian UI; square cells only; no fire animation; hit-testing on real cell buttons

**Scale/Scope**: 1 room, 2 seats, **16×22** sheet, 8 units (28 cells) + 5 trees + 2 crates per sheet

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Spec Before Code | Plan from spec v0.7; no product code in this command | PASS |
| II. Hidden Information | Enemy wounded tanks use a cell stamp, not a clipped 2×N hull; leak tests extended | PASS |
| III. Local Table, No Cloud | Same Node LAN host | PASS |
| IV. Rules Are Testable | Rectangles, rotate, validateFleet, randomValidFleet, views in Vitest | PASS |
| V. Paper Over Arcade | Ink SVG; static burn; square grid; tray is paper toys not 3D | PASS |
| Workflow | Implement later on `feat/` from `dev` | PASS |

Post-design re-check: `place` still sends own units only; `PlayerView` still omits opponent fleet and unrevealed decorations. Wound stamp does not encode remaining cells. Still PASS. No Complexity Tracking rows.

## Project Structure

### Documentation (this feature)

```text
specs/001-dense-field-placement/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── ws-protocol.md
│   └── placement-ui.md
└── tasks.md              # /speckit-tasks — not created here
```

### Source Code (repository root)

```text
apps/server/src/          # thin Room; fixtures/tests that hardcode 12×16
apps/client/src/
  components/             # GridBoard, PlacementBoard, PlacementTray, TankInk,
                          # WoundInk, BattleBoard, BurningTreeInk, CrateInk, ShotMap
  composables/useGame.ts  # unchanged protocol; status copy
  styles.css              # default --cell-size 22px
packages/shared/src/      # constants, types.Unit.width, fleet rectangles, tests
e2e/                      # drag tokens, 16×22, zoom, leak not in UI
```

**Structure Decision**: Keep the three-package layout. Geometry in `packages/shared`. Gestures and ink in `apps/client`. Server stays a dispatcher; it only sees new `Unit.width` / cell counts via existing `place` + `validateFleet`.

## Approach (delta from current code)

1. **Constants** — `COLS=16`, `ROWS=22`, `COL_LETTERS` 16 letters, `FLEET_SHAPES`, default CSS `--cell-size: 22px`. GridBoard min zoom = fit 16 columns.
2. **Fleet math** — `Unit.width`; `cellsForRect`; rectangle `validateFleet` / `randomValidFleet` / `rotateUnit`; Moore gap unchanged. `applyFire` already sinks when all `unit.cells` are hit — no shot-rule change besides more cells.
3. **Decorations** — same 5+2; `placeDecorations` already uses `COLS`/`ROWS`.
4. **Placement UI** — tray tokens; pointer-capture drag; ghost highlight; select + «Повернуть»; return to tray on tray drop. Remove length chips and global orientation.
5. **Ink** — board `TankInk` fills 2D viewBox; tray pose; `WoundInk` on enemy hits until sunk; richer static tree/crate burn.
6. **Fog** — BattleBoard must not reconstruct opponent rectangles from a single hit. Leak tests: JSON + “stamp not unique to a 2×4 slot”.
7. **Call sites** — ShotMap, room tests, Vitest fixtures, e2e, README.
8. **Copy** — status: «Перетащи танки на лист», «Тапни танк и нажми Повернуть».

## Complexity Tracking

> No constitution violations.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
