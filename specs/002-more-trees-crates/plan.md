# Implementation Plan: Больше ёлок и ящиков на листе

**Branch**: `002-more-trees-crates` (feature directory) | **Date**: 2026-09-16 | **Spec**: [spec.md](./spec.md)

**Git for implement**: constitution workflow — from latest `dev` create `feat/more-trees-crates`. The speckit id is not the git branch.

**Input**: Feature specification from `specs/002-more-trees-crates/spec.md` (v0.1)

**Note**: Filled by `/speckit-plan`. Count-only change on the existing LAN table.

## Summary

Keep `placeDecorations`, `applyFire`, and `getPlayerView`. Raise per-sheet décor to **10 trees + 4 crates** (14 cells). Shot rules, fog of war, fleet, and sheet size stay as shipped.

## Technical Context

**Language/Version**: TypeScript 5.9, Node.js ≥ 22.12

**Primary Dependencies**: Vue 3.5, Vite 7, `ws` ^8, pnpm workspaces (`apps/client`, `apps/server`, `packages/shared`)

**Storage**: In-memory `MatchState` (no database)

**Testing**: Vitest (`packages/shared` decorations + existing match/view leak tests)

**Target Platform**: Host macOS/Linux/Windows with Node; phones via LAN

**Project Type**: Local web table (static client + authoritative room)

**Performance Goals**: `placeDecorations` still finishes in the existing 200-attempt loop on 16×22 (324 free cells after a 28-cell fleet)

**Constraints**: No accounts, no P2P; fog of war in `getPlayerView`; no new WS messages; no fire animation

**Scale/Scope**: 1 room, 2 seats, 16×22, 8 units (28 cells) + **10 trees + 4 crates** per sheet

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Spec Before Code | Plan from spec v0.1; no product code in this command | PASS |
| II. Hidden Information | Counts change only in host `placeDecorations`; `getPlayerView` still omits unrevealed opponent décor | PASS |
| III. Local Table, No Cloud | Same Node LAN host | PASS |
| IV. Rules Are Testable | Vitest asserts 10 trees + 4 crates, no overlap, leak test unchanged | PASS |
| V. Paper Over Arcade | No new animation; existing ink | PASS |
| Workflow | Implement later on `feat/` from `dev` | PASS |

Post-design re-check: no new payload fields; `/api/host` still has no décor. Still PASS. No Complexity Tracking rows.

## Project Structure

### Documentation (this feature)

```text
specs/002-more-trees-crates/
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
packages/shared/src/decorations.ts       # TREE_COUNT, CRATE_COUNT
packages/shared/src/decorations.test.ts  # expect 10 + 4
packages/shared/src/match.ts             # already calls placeDecorations on ready/rematch
apps/client                              # no protocol change; own sheet already maps yourDecorations
```

**Structure Decision**: One constant pair in `packages/shared`. Server and Vue already iterate whatever `placeDecorations` returns.

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified

No rows.
