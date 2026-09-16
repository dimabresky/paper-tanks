# Contract: Placement and board UI

Not a second wire protocol. Playwright and a11y depend on these hooks.

## Grid

- `data-testid="cell"` with `data-x` / `data-y`; 16 columns × 22 rows.
- Header letters А–П; row numbers 1–22.
- `data-testid="zoom-in"` / `zoom-out`. Default cell size 22px; fit-sheet is the minimum.
- Cells remain real `<button>`s. Zoom changes `--cell-size`, not a transformed screenshot.

## Gestures

| Start | One finger | Two fingers |
|-------|------------|-------------|
| Tray token or placed tank | Drag unit (pointer capture); ghost on cells | Pinch zoom (existing) |
| Empty cell / labels / scroller chrome | Pan sheet (`overflow: auto`) | Pinch zoom / pan |

Ghost: full rectangle + conflict class when `!ok`. Drop commits ghost or reverts.

Return to tray: drop on `data-testid="placement-tray"` (or a token slot). Accidental drop outside the sheet does **not** remove the unit.

## Tray and rotation

- `data-testid="placement-tray"` visible in placement while not all eight are placed (empty tray after auto-place or full manual place).
- Each unplaced shape: `data-testid="tank-token"` and `data-shape` in `{2x4, 2x3, 1x2, 1x1}` (repeat tokens for two 2×3, three 1×2, two 1×1).
- Placed unit hit target: `data-testid="placed-tank"` + `data-unit-id`.
- Selected placed tank: visible selected state; `data-testid="rotate"` («Повернуть») rotates only that id. Disabled / no-op when nothing selected; `data-testid="status"` tells the player to tap a tank.
- `data-testid="random-fleet"` «Расставить как получится»; `data-testid="ready"` «Готов».

No length chips (`4` / `3` / `гориз.`).

## Ink

- Own units: `TankInk` filling the rectangle, clipped to those cells.
- Enemy opened tank cell, unit not sunk: `WoundInk` (same stamp every cell).
- Enemy sunk unit: full `TankInk` on the union of opened cells (all of them).
- Burning tree / opened crate: static SVGs, stronger contrast than intact versions; no animation class required.

## Status copy (Russian)

Examples: «Перетащи танки на лист», «Тапни танк и нажми Повернуть», existing battle lines unchanged in meaning.
