# Data Model: Dense field placement

Entities stay in `packages/shared`. Host `Room` holds one `MatchState`. Clients receive only `PlayerView`. This increment changes **Cell bounds**, **Unit shape**, and how the client **interprets opened enemy tank cells**. Phases, shots, decorations counts, and view projection fields are unchanged except as noted.

## Cell

| Field | Type | Rules |
|-------|------|--------|
| x | 0–15 | Column А–П (`COL_LETTERS`) |
| y | 0–21 | Row label y+1 (1–22) |

## Unit

| Field | Type | Rules |
|-------|------|--------|
| id | string | Unique per seat after `placeFleet` |
| length | 1 \| 2 \| 3 \| 4 | Long axis (cells) |
| width | 1 \| 2 | Short axis; **2** iff `length` is 3 or 4; **1** iff `length` is 1 or 2 |
| cells | Cell[] | Filled orthogonal rectangle; `cells.length === length * width`; in bounds; no Moore touch with other units |

Fleet composition (multiset): one 4×2, two 3×2, three 2×1, two 1×1 (written length×width in the oriented sense 2×4 / 2×3 / 1×2 / 1×1). **28 cells.**

Orientation: `horizontal` means length along x, width along y (e.g. 4×2 cells). Vertical: length along y, width along x (2×4 cells on the grid). `rotateUnit` swaps those.

Drawing (own sheet): SVG occupies exactly `cells`. Drawing (enemy, wounded): see PlayerView notes — not a field on Unit.

## Fleet

`units: Unit[]` — exactly the eight shapes above after `validateFleet`.

## Decoration

Unchanged: 5 trees + 2 crates per seat at battle start; not on unit cells; `burned` for opened trees. Opened crate is a **visual** state derived from shots (`result: "crate"`), not a new field unless the UI already uses `kind` + opened cell.

## Shot

Unchanged fields. `hit` / `sunk` still mean tank cells. A 2×4 unit is sunk only when **all 8** cells have been opened (fire or blast).

## Seat / MatchState

Unchanged. `place` still replaces `fleet`. Rematch clears fleets and decorations.

## PlayerView (projection)

Unchanged field set. Rules that matter for this feature:

- `yourFleet` — full rectangles (placement, battle, ended).
- Opponent fleet **never** included.
- `shotsYouFired` / `shotsOnYou` — the only way to know enemy tank cells.
- UI **must not** infer remaining cells of a wounded enemy unit from ink (stamp, not hull window).
- `yourDecorations` still only own list in battle/ended.

## Client-only (not in MatchState)

| Concept | Rules |
|---------|--------|
| Tray | Multiset of shapes not yet in `units` |
| Selection | `unit.id` or tray token; «Повернуть» applies only to a placed selected unit |
| Ghost | Rectangle under pointer using grab offset; `ok` from `canAddUnit` |
| Drag | Pointer capture on token/unit; pan on empty cells |

These never appear in `PlayerView`.

## Validation

- `validateFleet`: shape multiset + unique ids + rectangles + Moore gap + bounds.
- `placeDecorations`: empty cells on 16×22; 7 decorations; retry on collision.
- `applyFire`: unchanged codes; bounds follow new COLS/ROWS.
- Client drop/rotate: invalid → keep last valid `units`; still send last valid `place` (or skip send).

## State transitions (unchanged)

```text
lobby --both seats--> placement --both ready--> battle --0 tanks or disconnect--> ended
ended --both rematch--> placement
```

Decorations still created on placement→battle. Tray/ghost exist only in placement UI.
