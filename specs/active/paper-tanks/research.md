# Research: Paper Tanks v1.4 (LAN table, field, scenery)

**Date**: 2026-09-13  
**Spec**: v1.4  
**Status**: Complete

## Decision: Keep LAN host, reject P2P

- **Decision**: One Node process on the PC remains HTTP+WebSocket authority. Phones join via QR. No WebRTC, no phone-as-host.
- **Rationale**: Clarify session 2026-09-13 option A. A browser tab cannot serve the app to a peer or open a reliable secure-context DataChannel on `http://192.168.x.x`. Fog of war already requires a referee; that referee is the existing Room.
- **Alternatives considered**: WebRTC DataChannels between phones (blocked by secure context + who serves the page); cryptographic commitment without a host (cheating without ZK proofs); native/PWA wrap (out of scope).

## Decision: Decorations generated on battle start, authoritative

- **Decision**: When both seats `ready` with valid fleets, `setReady` places 10 trees + 4 crates per seat on empty cells (may touch tanks, must not overlap tanks or other decorations). Stored on `Seat.decorations`. Regenerated on rematch.
- **Rationale**: Spec FR-013 / US6 — after accepted fleets, visible on own sheet in battle, hidden on the enemy sheet until opened. Generating at battle start keeps placement UI uncluttered.
- **Alternatives considered**: Generate during placement (clutters tank taps); generate on first `place` (unstable as the player edits the fleet).

## Decision: Shot results `tree` | `crate` plus blast shots

- **Decision**: Extend `ShotResult` with `tree` and `crate`. Crate splash writes extra `Shot` records with `cause: "blast"` for 2–4 unopened Moore neighbors. Nested crate: reveal as `crate` without a second blast. Any blast/fire that damages a tank cell keeps the turn; tree-only or empty blast passes the turn.
- **Rationale**: Matches FR-014/FR-015 without a second client message. Tests can inject RNG.
- **Alternatives considered**: One shot object with `explodedCells[]` only (harder for the grid UI and leak tests); chain-reacting crates (spec forbids).

## Decision: Stats count taps vs tank cells

- **Decision**: `stats.fired` = shots with `cause: "fire"` (the cell the player tapped). `stats.hits` = results `hit` or `sunk` from fire or blast. Tree/crate taps are fired but not hits unless splash also records hit/sunk (those hit cells increment `hits`, not `fired`).
- **Rationale**: Accuracy stays about aiming at tanks, not about how many splash cells opened.
- **Alternatives considered**: Count every opened cell as fired (punishes crates); count crate as a hit (misleading).

## Decision: View projection for scenery

- **Decision**: `PlayerView.yourDecorations` = full own list in battle/ended. Opponent scenery only via `shotsYouFired` results (`tree` / `crate` / blast). Extend leak tests: opponent decoration coordinates MUST NOT appear except on already-fired cells. `opponentFleetCellKeys` stays; add `opponentDecorationCellKeys`.
- **Rationale**: Constitution II / FR-003.
- **Alternatives considered**: Draw enemy trees as visible terrain (leaks empty cells).

## Decision: Tank drawing clipped to occupied cells

- **Decision**: Keep `randomValidFleet` occupancy rules. Fix visuals: SVG viewBox matches 1×N cells; `overflow: hidden` on `.tank-origin`; barrel/turret paths stay inside the box. No `overflow: visible`.
- **Rationale**: Current `TankInk` uses `overflow: visible` and a barrel that leaves the viewBox — that is the auto-place “model sticks out of the grid” bug, not invalid cell math.
- **Alternatives considered**: Shrink logical length (would change rules); clip only at field edge (still paints neighbor cells).

## Decision: Board chrome is square cells only

- **Decision**: Remove the page-level `repeating-linear-gradient` pair (horizontal “lined” + vertical) from covering `.board`. `.sheet` may stay a paper color wash. `.cell` borders are the only grid.
- **Rationale**: Spec FR-006 / constitution V. Today `.sheet` draws lined+squared paper and `.cell` draws another grid.
- **Alternatives considered**: Lined paper only outside the board (acceptable for chrome; must not show through the field).

## Decision: Zoom by real cell size, not a screenshot transform

- **Decision**: `--cell-size` (default max(36px, fit-or-scroll)). Viewport `.board-scroller { overflow: auto }`. Buttons +/− and pinch adjust `--cell-size` between fit-sheet and ~2× default. Cells remain `<button>`s so taps hit the right coordinate.
- **Rationale**: SC-004. CSS `transform: scale` on a fitted board often mis-maps touch targets.
- **Alternatives considered**: Canvas zoom (hurts a11y); fit-entire-sheet at all costs (cells < 36px, rejected by spec).

## Decision: Copy and host QR lifecycle

- **Decision**: One `status` line from `phase` + turn. Hide `HostPanel` when `seatsTaken === 2`. Rename buttons as in FR-017. Keep firewall/AP-isolation copy only on the waiting host screen.
- **Rationale**: FR-016. Current HostPanel stays into placement and uses «гориз.» / «Враг».
- **Alternatives considered**: Separate onboarding route (unnecessary for a one-room table).

## Decision: No stack change

- **Decision**: Stay on Vue 3 + `ws` + Vitest + Playwright. Do not introduce Pinia (composable `useGame` is enough). Do not introduce Canvas.
- **Rationale**: Constitution simplicity; existing tests already cover join/place/fire/view leaks.
- **Alternatives considered**: Colyseus/Socket.IO (still unnecessary for one room).
