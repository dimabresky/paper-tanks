# Contract: LAN table WebSocket (delta)

Base URL unchanged: `http://<lan-ipv4>:8787/`. Transport unchanged: JSON on `/ws`. **No new message types.**

## HTTP (unchanged)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | Vue client |
| GET | `/api/health` | `{ ok: true }` |
| GET | `/api/host` | `{ preferredUrl, joinUrls, qrSvg }` — MUST NOT contain fleets or decorations |

## Client → server

Unchanged: `join`, `place`, `ready`, `fire`, `rematch`, `ping`.

`ready` still triggers host `placeDecorations` when both fleets are valid. There is no client message that sets tree/crate counts.

## Server → client

Unchanged types: `joined`, `view`, `error`, `pong`.

After battle start, `PlayerView.yourDecorations` MUST contain **10** `kind: "tree"` and **4** `kind: "crate"` for that seat.

## Leak contract (tests)

1. `JSON.stringify(getPlayerView(state, "a"))` MUST NOT contain coordinates of B’s **unrevealed** decoration cells (existing pattern).
2. Count of own trees/crates in A’s view after battle start MUST be 10 and 4; that MUST NOT imply B’s coordinates are present.

## Error codes (unchanged)

`ROOM_FULL` `NOT_YOUR_TURN` `CELL_TAKEN` `BAD_FLEET` `BAD_PHASE` `BAD_MESSAGE` `UNKNOWN_SEAT` — Russian `message` as today.
