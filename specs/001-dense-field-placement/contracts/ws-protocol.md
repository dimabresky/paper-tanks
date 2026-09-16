# Contract: LAN table WebSocket (delta)

Base URL unchanged: `http://<lan-ipv4>:8787/`. Transport unchanged: JSON on `/ws`. **No new message types.**

## HTTP (unchanged)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | Vue client |
| GET | `/api/health` | `{ ok: true }` |
| GET | `/api/host` | `{ preferredUrl, joinUrls, qrSvg }` — MUST NOT contain fleets or decorations |

## Client → server

```text
join     { nick?: string, token?: string }
place    { units: Unit[] }    // Unit now includes width; cells fill the rectangle
ready    {}
fire     { x: number, y: number }   // x 0–15, y 0–21
rematch  {}
ping     {}
```

`place.units[]` MUST satisfy `validateFleet` (28 cells, eight shapes). Invalid → `BAD_FLEET` «Танки пересекаются или вылезают с листа» (or the existing Russian string).

There is **no** `rotate` or `select` message. Rotation is local; the next `place` sends the new `cells`.

`fire` out of 16×22 → existing bad-cell / not-your-turn handling (in-bounds check uses new constants).

## Server → client

Unchanged types: `joined`, `view`, `error`, `pong`.

`PlayerView.yourFleet.units[].cells` may list 8 cells for a 4×2 unit. Opponent coordinates still absent.

## Leak contract (tests)

1. `JSON.stringify(getPlayerView(state, "a"))` MUST NOT contain any `${x},${y}` (or equivalent) of B’s **unrevealed** unit or decoration cells (existing pattern; fixtures use 2×4 units).
2. After **one** hit on a 2×4 of B, view JSON MUST NOT contain the other seven cell keys of that unit.
3. After **sunk**, those cell keys MAY appear only as entries in `shotsYouFired` / `shotsOnYou`, not as `yourFleet` of the opponent.

## Error codes (unchanged set)

`ROOM_FULL` `NOT_YOUR_TURN` `CELL_TAKEN` `BAD_FLEET` `BAD_PHASE` `BAD_MESSAGE` `UNKNOWN_SEAT` — Russian `message` as today.
