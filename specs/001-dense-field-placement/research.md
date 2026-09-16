# Research: Dense field, figurines, stronger burn

**Date**: 2026-09-16  
**Spec**: `specs/001-dense-field-placement/spec.md` v0.6  
**Status**: Complete

## Decision: Keep the LAN table; change sheet, fleet rectangles, placement UI, ink

- **Decision**: Same Node host, `ws` JSON, `getPlayerView`. No new message types. Change `COLS`/`ROWS`, fleet rectangles, client placement gestures, tank/burn SVGs.
- **Rationale**: Spec assumes the shipped game; constitution III/II.
- **Alternatives considered**: New `rotate` client message (selection is local until `place`); Canvas board (breaks cell hit-testing).

## Decision: Sheet 16×22, letters А–П

- **Decision**: `COLS = 16`, `ROWS = 22`, `COL_LETTERS = "АБВГДЕЖЗИЙКЛМНОП"` (skip Ё, keep Й). Cell `x` 0–15, `y` 0–21. Labels 1–22.
- **Rationale**: Spec FR-001 / assumption «например А–П».
- **Alternatives considered**: Skip Й (would not be 16 letters without inventing Ъ); Latin fallback as only labels (forbidden).

## Decision: Fleet as eight rectangles, not eight lines

- **Decision**: Replace line occupancy with shapes:

  | Count | length | width | cells |
  |-------|--------|-------|-------|
  | 1     | 4      | 2     | 8     |
  | 2     | 3      | 2     | 6     |
  | 3     | 2      | 1     | 2     |
  | 2     | 1      | 1     | 1     |

  Total 28 cells. Add `width: 1 | 2` on `Unit`. `cells.length === length * width`. Export `FLEET_SHAPES`; keep `FLEET_LENGTHS` as the length column only if tests still need it.

- **Rationale**: Spec FR-008 / Q2.
- **Alternatives considered**: Infer width only from bounding box (ambiguous for a 2×2 which we do not have); keep `length === cells.length` (would lie for 2×4).

## Decision: `cellsForRect` + rectangle validation

- **Decision**: `cellsForRect(origin, length, width, horizontal)` fills a rectangle: long axis = `length`, short = `width`. `isOrthogonalRectangle` replaces “contiguous line”. Moore no-touch and in-bounds stay. `randomValidFleet` / `tryPlace` use rectangle bounds (`COLS - length` vs `COLS - width` depending on orientation). `rotateUnit(unit)` swaps orientation (2×4 ↔ 4×2) around the bounding-box centre, then snaps origin to integer cells; if the result is out of bounds or touches, return `null` (client keeps the previous cells).
- **Rationale**: One place for geometry (`packages/shared/src/fleet.ts`). Pivot was deferred in clarify; centre-then-snap is predictable and testable.
- **Alternatives considered**: Rotate around a corner (jumps farther at edges); client-only rotation math (two sources of truth).

## Decision: `place` payload still `{ units: Unit[] }`

- **Decision**: Client sends full `cells` plus `length` and `width`. Server `validateFleet` rejects wrong multiset of shapes or non-rectangles with existing `BAD_FLEET`. No `rotate` / `select` messages.
- **Rationale**: YAGNI; table already accepts a whole fleet on each edit.
- **Alternatives considered**: Send origin+orientation only (smaller messages, more server reconstruction).

## Decision: Default cell ~22px; zoom still real `--cell-size`

- **Decision**: Default `--cell-size` **22px** (was 36). Min zoom = fit whole 16×22 in the scroller. Max remains large enough for a finger (~56–72px). Buttons +/− and two-finger pinch unchanged. Cells stay `<button data-testid="cell">`.
- **Rationale**: SC-001 — more cells visible on ~360px (≈15 columns vs ≈9 at 36px). Comfort is zoom-in, not the default.
- **Alternatives considered**: Keep 36px default (contradicts spec); `transform: scale` (mis-hits).

## Decision: Pointer capture on figurines; native pan elsewhere

- **Decision**: `pointerdown` on a tray token or placed tank: `setPointerCapture`, `touch-action: none` on that element, move updates ghost, `pointerup` commits. `pointerdown` on an empty cell or labels: do not capture; `.board-scroller { overflow: auto }` pans. Two-finger touch: existing pinch handler; browser may pan. Drag that ends on the tray (or a `data-testid="placement-tray"` hit target) removes the unit; drag that ends off-board otherwise restores last valid cells.
- **Rationale**: Spec Q on drag vs pan.
- **Alternatives considered**: Long-press to pick up (rejected in clarify); CSS `touch-action: none` on the whole scroller (blocks pan).

## Decision: Ghost origin follows grab offset

- **Decision**: On pick-up, store pointer cell relative to the rectangle origin. While dragging, ghost cells = `cellsForRect(pointerCell - offset, …)`. Highlight uses `canAddUnit` excluding the unit being moved. Drop commits that rectangle or reverts.
- **Rationale**: Spec: preview is what you get; grabbing the turret should not slam top-left onto the finger.
- **Alternatives considered**: Always snap top-left to the hovered cell (jumps).

## Decision: Enemy wounded tank is a cell stamp, not a clipped hull

- **Decision**: Own sheet and tray: full `TankInk` in the unit rectangle, `overflow: hidden`. Enemy sheet: for `hit` cells of a unit that is **not** yet sunk, draw a repeated **wound stamp** (tank-ish ink, same in every opened cell). When the unit is **sunk** (all its cells appear in `shotsYouFired` / equivalent opened set), draw the full model in that rectangle. Never use opponent `fleet` — only opened shot cells. Leak test: a view JSON plus a rendered “would this SVG exist only if neighbor cell belonged to the same unit?” — the stamp must not encode hull position.
- **Rationale**: Clip of a 2×4 SVG on one cell still leaks orientation (FR-010 / FR-017 / constitution II). Spec v0.7: stamp until sunk, full hull only when all cells are open.
- **Alternatives considered**: Clip full artwork to opened cells (leaks); hide tank ink until sunk (weaker than a readable wound stamp).

## Decision: Tray figurines vs board top-down

- **Decision**: New `PlacementTray` under (phone) / beside (wide) the sheet. Eight tokens, side-view / “standing toy” SVG (`pose="tray"`). On the sheet, same type uses `pose="board"` top-down filling the rectangle. `data-testid="tank-token"` + `data-shape="2x4"|…`. Length-chip buttons go away.
- **Rationale**: Spec US2 “вертикальные фигурки”; constitution V still ink, not 3D.
- **Alternatives considered**: One drawing for both (tray would look like a flat stamp).

## Decision: Stronger burn is still static SVG

- **Decision**: Rework `BurningTreeInk` and add/replace crate-open drawing (`OpenedCrateInk` or burned variant of `CrateInk`): denser strokes, smoke curls, burst crate — same blue/brown pen, **no CSS animation**, no audio. Shot rules and decoration counts unchanged. `placeDecorations` already loops `COLS×ROWS`.
- **Rationale**: Spec US4 / constitution V.
- **Alternatives considered**: Animated flame (out of scope).

## Decision: Fix hardcoded 12×16 call sites

- **Decision**: `ShotMap.vue` (`COLS * 16`), `room.test.ts` (`12 * 16`), fleet fixtures in Vitest/e2e, README 12×16 — all follow constants. No remaining magic grid size.
- **Rationale**: Otherwise e2e/minimap lie after COLS/ROWS change.
- **Alternatives considered**: Leave ShotMap as 12×16 (bug).
