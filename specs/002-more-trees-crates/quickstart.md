# Quickstart: More trees and crates

Validation after implement (not this plan command). Host Node 22.12+, pnpm 10.

## Prerequisites

```bash
npx pnpm@10 install
```

## Checks

```bash
npx pnpm@10 --filter @paper-tanks/shared test
npx pnpm@10 typecheck
```

Expected:

- `placeDecorations` on a valid 16×22 rectangle fleet yields **10 trees + 4 crates**, never on unit cells, no decoration overlap.
- Existing tree/crate fire tests still pass (burn, 2–4 blast, no chain).
- Leak test: opponent unrevealed décor still absent from `getPlayerView`.

Optional: `npx pnpm@10 test:e2e` — match still completes (counts are not asserted in Playwright unless added later).

## Manual LAN pass

```bash
npx pnpm@10 dev
```

Open `http://127.0.0.1:8787/` (and a phone on LAN QR).

1. Both ready with auto-place.
2. Own sheet shows **ten** trees and **four** crates (count by eye or DevTools `yourDecorations`).
3. Opponent sheet shows none of those until shot.
4. Shoot a tree (turn passes) and a crate (2–4 extra cells; nested crate does not explode).
5. Rematch → new 10+4 after both ready again.

See [data-model.md](./data-model.md), [contracts/ws-protocol.md](./contracts/ws-protocol.md).
