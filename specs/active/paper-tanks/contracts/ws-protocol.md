# Contract: LAN table WebSocket + host HTTP

Base URL on the host PC: `http://<lan-ipv4>:8787/` (never advertise `169.254.0.0/16` as the preferred QR target).

Transport: existing JSON messages on `ws://<host>:8787/ws`. This increment does **not** add endpoints or change join. It extends `view` payloads and shot `result` values.

## HTTP (unchanged)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | Vue client |
| GET | `/api/health` | `{ ok: true }` |
| GET | `/api/host` | `{ preferredUrl, joinUrls, qrSvg }` — MUST NOT contain fleets or decorations |

## Client → server

Unchanged types:

```text
join     { nick?: string, token?: string }
place    { units: Unit[] }
ready    {}
fire     { x: number, y: number }     // one tap; server may append blast shots
rematch  {}
ping     {}
```

`fire` remains a single cell. Splash is not a second client command.

## Server → client

```text
joined   { token, seat, joinUrls }
view     PlayerView                  // extended fields below
error    { code, message }           // Russian message for UI
pong     {}
```

### PlayerView additions

| Field | When | Content |
|-------|------|---------|
| yourDecorations | battle, ended | Own trees/crates (`kind`, `cell`, `burned`) |
| yourDecorations | lobby, placement | `[]` or omit |
| shotsYouFired[].result | | `miss` \| `hit` \| `sunk` \| `tree` \| `crate` |
| shotsYouFired[].cause | | `fire` \| `blast` |
| lastShot | | Same shape; UI maps tree→«ёлка», crate→«ящик» |
| stats.fired | | Count of `cause: "fire"` only |

Omitted forever: opponent fleet coordinates, opponent decoration coordinates not present in `shotsYouFired`.

### Error codes (unchanged set)

`ROOM_FULL` «Мест нет — уже двое за столом»  
`NOT_YOUR_TURN` «Сейчас ход соперника»  
`CELL_TAKEN` «Уже стреляли сюда»  
`BAD_FLEET` «Танки пересекаются или вылезают с листа»  
`BAD_PHASE` / `BAD_MESSAGE` «Не вышло, попробуй ещё раз» (or the specific Russian string from `GameError`)  
`UNKNOWN_SEAT`

## Leak contract (tests)

Serializing `getPlayerView(state, "a")` MUST NOT contain any string `${x}:${y}` of B’s unrevealed unit or decoration cells. Existing `view.test.ts` pattern extends to decorations.

## UI contract (client, not a second protocol)

- `data-testid="host-panel"` visible only while `seatsTaken < 2`.
- `data-testid="cell"` remains the tap target; zoom must not retarget a different cell.
- Board root has no lined-paper background; cells are squares.
- Current-step copy is a single visible status line (`data-testid="status"`).
