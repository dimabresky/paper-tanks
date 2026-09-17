# Data Model: More trees and crates

Entities stay in `packages/shared`. This increment changes **Decoration counts only**. Cell, Unit, Fleet, Shot, Seat, MatchState, and PlayerView field sets are unchanged.

## Decoration

| Field | Type | Rules |
|-------|------|--------|
| id | string | Unique per seat at place time (e.g. `tree-0` … `crate-13`) |
| kind | `tree` \| `crate` | Multiset per seat at battle start: **10 tree + 4 crate** |
| cell | Cell | In bounds; not on any unit cell; unique among decorations of that seat |
| burned | boolean | Trees: true after that cell opens as `tree`. Crates: unused for blast math (opened crate is visual from shots) |

May be Moore-adjacent to tanks. Must not overlap units or other decorations.

`placeDecorations(fleet)` MUST return length 14 with those kinds, or throw (must not start battle with a short list).

## Seat

`decorations: Decoration[]` — empty in placement; after both `ready`, each seat has 14 items. Rematch clears, then `placeDecorations` runs again on the next battle start.

## PlayerView (projection)

Unchanged fields.

- `yourDecorations` — all 14 of own seat (placement may be empty until battle).
- Opponent décor only via opened `shotsYouFired` / `shotsOnYou` cells, never as a list of unrevealed coordinates.

## Shot

Unchanged. `result: "tree" | "crate"` and crate `blast` of 2–4 Moore cells as today.
