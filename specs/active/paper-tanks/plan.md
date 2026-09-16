# Implementation Plan: Paper Tanks (v1.4 field & table)

**Branch**: `paper-tanks` (feature directory) | **Date**: 2026-09-13 | **Spec**: [spec.md](./spec.md)

**Git for implement**: constitution workflow — from latest `dev` create `feat/<topic>` (or `fix/<topic>`). The speckit feature id `paper-tanks` is not the git branch.

**Input**: Feature specification from `specs/active/paper-tanks/spec.md` (v1.4)

**Note**: Filled by `/speckit-plan`. This is an evolution of the existing LAN table in this repository, not a greenfield app.

## Summary

Keep the current LAN table: one Node process on the host PC (HTTP + WebSocket `:8787`), Vue client, rules in `packages/shared`, per-seat `getPlayerView`. Do **not** add phone-to-phone P2P.

This increment changes what players see and what a shot can resolve to: squared notebook grid only, tanks drawn inside their cells, larger cells with pan/zoom, clearer Russian copy, and ink trees/crates with static burning trees and crate blasts resolved on the server.

## Technical Context

**Language/Version**: TypeScript 5.9, Node.js ≥ 22.12

**Primary Dependencies**: Vue 3.5, Vite 7, `ws` ^8, `qrcode`, pnpm workspaces (`apps/client`, `apps/server`, `packages/shared`)

**Storage**: In-memory `MatchState` in the host process (no database)

**Testing**: Vitest (shared + server), Playwright (two browser contexts)

**Target Platform**: Host macOS/Linux/Windows with Node; players in Safari iOS / Chrome Android / desktop Chrome via LAN HTTP

**Project Type**: Local web table (static client + authoritative room on the same port)

**Performance Goals**: Shot round-trip on a home LAN typically under 200 ms; if a fire reply takes more than 3 s, `data-testid="status"` shows wait copy (task T047)

**Constraints**: No accounts, no internet lobby, no WebRTC; bind `0.0.0.0:8787`; fog of war in `getPlayerView`; Russian UI; cell grid only on the board

**Scale/Scope**: 1 room, 2 seats, 12×16 sheet, 8 units + 10 trees + 4 crates per sheet

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Spec Before Code | Plan from spec v1.4; no product code in this command | PASS |
| II. Hidden Information | Fleets and unrevealed decorations stay on the host; `getPlayerView` remains the only payload | PASS |
| III. Local Table, No Cloud | Keep Node LAN host; P2P explicitly out of scope | PASS |
| IV. Rules Are Testable | Trees, crates, blast, and view leaks added as pure functions + Vitest | PASS |
| V. Paper Over Arcade | Remove lined overlay on the board; ink SVG; static burning tree, no fire animation | PASS |
| Workflow | Process lives in constitution, not this spec; implement later on `feat/` from `dev` | PASS |

Post-design re-check: contracts and data model do not put opponent fleet or unrevealed decorations in `PlayerView`. Still PASS. No Complexity Tracking rows.

## Project Structure

### Documentation (this feature)

```text
specs/active/paper-tanks/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── ws-protocol.md
└── tasks.md              # /speckit-tasks — not created here
```

### Source Code (repository root)

```text
apps/server/src/          # HTTP + /ws Room, LAN QR
apps/client/src/          # Vue 3 table UI
  components/             # GridBoard, TankInk, PlacementBoard, BattleBoard, HostPanel
  composables/useGame.ts
  styles.css
packages/shared/src/      # types, fleet, match, view, tests
e2e/                      # Playwright two-player match
```

**Structure Decision**: Keep the existing pnpm three-package layout. New rules go in `packages/shared`. New ink drawings and board chrome go in `apps/client`. `apps/server` stays a thin Room over shared functions (generate decorations on battle start via `setReady`).

## Approach (delta from current code)

1. **Transport unchanged** — `ClientMessage` / `ServerMessage` stay JSON over `/ws`. No new join path.
2. **`ShotResult`** gains `tree` and `crate`. A crate shot may append extra `Shot` rows with `cause: "blast"` for splash cells.
3. **Decorations** live on each `Seat` after both players ready. Opponent decorations appear in a view only as cells already present in `shotsYouFired`.
4. **Tank ink** — `overflow: hidden` on the unit layer; SVG paths stay inside the viewBox of occupied cells (barrel no longer sticks out).
5. **Sheet chrome** — page may be paper-colored; `.board` uses only square cell borders. Remove the lined+squared repeating background that currently sits under/over the field.
6. **Scale** — `--cell-size` default ≥ 36px on a ~360px phone (board scrolls). Zoom buttons and pinch change size between “fit sheet” and large cells. Hit-testing stays on real cell buttons (scale the grid, do not overlay a transformed screenshot).
7. **Copy** — one current-step line; hide `HostPanel` once `seatsTaken === 2`; labels «Повернуть», «Чужой лист», «Мой лист».
8. **Stats** — `fired` = player taps; `hits` = tank cells opened (including blast); last result may be ёлка/ящик.

## Complexity Tracking

> No constitution violations.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
