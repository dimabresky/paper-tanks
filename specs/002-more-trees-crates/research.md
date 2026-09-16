# Research: More trees and crates

**Date**: 2026-09-16  
**Spec**: `specs/002-more-trees-crates/spec.md` v0.1  
**Status**: Complete

## Decision: Change only `TREE_COUNT` and `CRATE_COUNT`

- **Decision**: In `packages/shared/src/decorations.ts` set `TREE_COUNT = 10`, `CRATE_COUNT = 4`. Keep `DECORATION_COUNT = TREE_COUNT + CRATE_COUNT` (14). Keep the shuffle-and-slice loop (200 attempts). `setReady` / rematch already call `placeDecorations` per seat.
- **Rationale**: Spec FR-001 / FR-005. Placement algorithm already scales with `DECORATION_COUNT`. 16×22 minus 28 fleet cells leaves 324 empties — 14 is not tight.
- **Alternatives considered**: Hard-code 14 picks in `match.ts` (two sources of truth); client-side generation (violates constitution II).

## Decision: Do not change `applyFire` or `getPlayerView`

- **Decision**: Tree burn, crate blast 2–4 Moore cells, no crate chain, series-on-tank-hit, and fog of unrevealed opponent décor stay as shipped.
- **Rationale**: Spec FR-002–FR-004, FR-006. More crates only raise how often a blast can happen.
- **Alternatives considered**: Cap blast size when four crates sit close (spec forbids formula change).

## Decision: Tests assert 10 + 4; leak test stays

- **Decision**: Update `decorations.test.ts` length expectations. Existing `view.test.ts` leak of a hidden opponent tree still applies (one hidden cell is enough). Match tests that inject one tree/crate fixture do not depend on total count.
- **Rationale**: Constitution IV; SC-001 / SC-002.
- **Alternatives considered**: Snapshot full `PlayerView.yourDecorations` in e2e (optional, not required if unit test covers counts).

## Decision: No new WS fields or UI copy

- **Decision**: `yourDecorations` already lists all own décor. Vue already draws every item. No Russian status string needs “десять ёлок”.
- **Rationale**: Spec assumptions.
- **Alternatives considered**: A counter chip on the HUD (out of spec).
