# Quickstart: Dense field placement

Validation after implement (not this plan command). Host Node 22.12+, pnpm 10.

## Prerequisites

```bash
npx pnpm@10 install
```

## Checks

```bash
npx pnpm@10 test
npx pnpm@10 typecheck
npx pnpm@10 test:e2e
```

Expected:

- Shared tests: `validateFleet` accepts one 2×4, two 2×3, three 1×2, two 1×1; rejects old 1×4 line as the “four”; `rotateUnit` swaps 2×4 ↔ 4×2; `randomValidFleet` succeeds ≥ 20 times on 16×22; leak test after a single hit on a wide tank does not serialize the other cells.
- Typecheck clean.
- E2E: two contexts, sheet 16×22, drag at least one token, rotate via select + «Повернуть», zoom still hits the visible cell, match can complete (auto-place allowed for the rest of the fleet).

## Manual LAN pass

```bash
npx pnpm@10 dev
```

Open `http://127.0.0.1:8787/` (and a phone on LAN QR).

1. Default zoom shows **more** columns than the old 36px / 12-wide sheet; «+» makes cells finger-sized.
2. Tray shows tank toys, not length buttons. Drag a 2×4: ghost matches drop. Empty-cell drag pans. Two-finger pinch zooms.
3. Tap a placed tank, «Повернуть» — rectangle flips or conflict highlight.
4. Ready both; trees/crates still 5+2. Shoot a tree and a crate: burn/open drawings are obviously stronger, still static.
5. Wound an enemy 2×4 once: opened cell does not reveal the rest of the hull. Sink it: full model.

See [data-model.md](./data-model.md), [contracts/ws-protocol.md](./contracts/ws-protocol.md), [contracts/placement-ui.md](./contracts/placement-ui.md).
