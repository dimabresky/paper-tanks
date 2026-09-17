# Quickstart: Paper Tanks v1.4

Validate the LAN table and the v1.4 field rules without implementing from scratch — this repo already runs a two-seat match. After implementation of this plan, the checks below MUST pass.

## Prerequisites

- Node.js ≥ 22.12
- pnpm 9+ (repo pins `pnpm@10`)
- Two browsers or Playwright

## Setup

```bash
pnpm install
pnpm test
pnpm typecheck
```

## Run the table

```bash
pnpm dev
```

Open `http://127.0.0.1:8787/` on the host. Phones use the QR / LAN URL on the host card (same Wi‑Fi, not `localhost` on the phone).

Production-style:

```bash
pnpm start
```

## Automated validation

```bash
pnpm test          # shared rules + room
pnpm test:e2e      # two Playwright contexts, full match
```

After this plan is implemented, shared tests MUST also cover:

- `placeDecorations`: 10 trees + 4 crates, no overlap with fleet
- `applyFire` tree → result `tree`, turn passes
- `applyFire` crate → 2–4 blast cells; nested crate does not re-blast; turn kept iff a tank cell was damaged
- `getPlayerView`: opponent decoration cells absent until fired
- Auto-place still in-bounds; fixture/render check that tank SVG does not paint outside occupied cells (component or snapshot)

## Manual / acceptance (spec SC)

1. Host screen shows QR; after two seats, QR is gone from player UI.
2. Board shows square cells only (no lined ruling on the field).
3. «Расставить как получится»: tank drawings stay inside cells and the sheet frame.
4. Default cell size ≥ 36px or the sheet scrolls; +/− or pinch changes the visible zone; a tap still hits that cell.
5. After both Ready: own sheet shows trees and crates; enemy sheet does not, until shots.
6. Shot on a tree → static burning tree, turn to opponent.
7. Shot on a crate → nearby cells open; a nearby tank can be damaged.
8. Status line states the current action in Russian.

## Expected outcomes

- `GET /api/host` has URLs + SVG, no fleet JSON.
- Disconnect > 60 s in battle → remaining player sees «Соперник вышел. Победа за тобой».
- WAN unplugged after both joined → match still plays.
