# Data Model: Paper Tanks v1.4

Entities live in `packages/shared`. The host `Room` holds one `MatchState`. Clients receive only `PlayerView`.

## Cell

| Field | Type | Rules |
|-------|------|--------|
| x | 0–11 | Column А–Л |
| y | 0–15 | Row 1–16 |

## Unit

| Field | Type | Rules |
|-------|------|--------|
| id | string | Unique per seat after `placeFleet` (`{seat}-{i}`) |
| length | 1 \| 2 \| 3 \| 4 | Equals `cells.length` |
| cells | Cell[] | Orthogonal contiguous, in bounds, no Moore touch with other units |

Fleet: lengths `[4,3,3,2,2,2,1,1]` (18 cells). Drawing occupies exactly those cells.

## Decoration

| Field | Type | Rules |
|-------|------|--------|
| id | string | Unique per seat |
| kind | `tree` \| `crate` | |
| cell | Cell | Empty of units and other decorations |
| burned | boolean | Trees only; true after that cell is opened as tree |

Per seat at battle start: 10 trees, 4 crates. May be Moore-adjacent to tanks. Must not overlap units or decorations.

## Shot

| Field | Type | Rules |
|-------|------|--------|
| by | SeatId | Attacker |
| cell | Cell | |
| result | `miss` \| `hit` \| `sunk` \| `tree` \| `crate` | |
| cause | `fire` \| `blast` | `fire` = player tap; `blast` = crate splash |
| sunkUnitId | string? | Only for `sunk`; stripped in views if it would identify a hidden unit id unnecessarily — keep internal, omit from public view if unused by UI |
| at | number | epoch ms |

A crate `fire` is followed by 2–4 `blast` shots on unopened in-bounds Moore neighbors, chosen by injected RNG. Blast on another crate → `result: "crate"`, no nested blast.

Turn: keep attacker if any new `hit`/`sunk` in that fire resolution (primary or blast); otherwise pass.

## Seat

| Field | Type | Rules |
|-------|------|--------|
| id | `a` \| `b` | |
| nick | string | Sanitized; default «Игрок 1/2» |
| token | string | Reconnect |
| ready | boolean | Cleared on new `place` |
| fleet | Fleet \| null | |
| decorations | Decoration[] | Empty until battle; cleared on rematch |
| connected | boolean | |
| lastSeen | number | |

## MatchState

| Field | Type | Rules |
|-------|------|--------|
| phase | lobby \| placement \| battle \| ended | lobby→placement when both seats filled |
| seats | Record&lt;SeatId, Seat \| null&gt; | Max 2 |
| shots | Shot[] | Includes blast |
| turn | SeatId \| null | |
| winner | SeatId \| `disconnect` \| null | |
| startedAt / endedAt | number? | |
| rematchVotes | SeatId[] | Both → new placement, same seats/nicks/tokens, new decorations later |
| endedReason | `fleet` \| `disconnect`? | |

### Phase transitions

```text
lobby --both seats--> placement --both ready--> battle --0 tanks or disconnect--> ended
ended --both rematch--> placement
placement --seat expire--> lobby (if a seat freed)
```

Decorations are created on the placement→battle edge. They are not present in lobby/placement views.

## PlayerView (projection)

Must include: identity, phase, own fleet, own decorations (battle/ended), ready flags, tank counts (numbers only), turn, `shotsYouFired`, `shotsOnYou`, lastShot, stats `{ fired, hits, accuracy }`, winner, seatsTaken.

Must **not** include: opponent `fleet`, opponent `decorations` except cells already in `shotsYouFired`, opponent tokens.

`fired` = count of own shots with `cause === "fire"`.  
`hits` = count of own shots with `result` in `{ hit, sunk }`.  
`accuracy` = `fired === 0 ? 0 : round(hits / fired * 100)`.

## Validation

- `validateFleet` unchanged (touch + bounds + composition).
- `placeDecorations(fleet, rng)` in `packages/shared/src/decorations.ts` → 7 cells; retry if collision; never on unit cells.
- `applyFire` rejects out of turn, taken cells (any prior shot by this attacker on that cell, including blast — a blasted cell is already open), bad phase.
- Opening a cell twice: `CELL_TAKEN`.
