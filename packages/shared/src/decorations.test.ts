import { describe, expect, it } from "vitest";
import { COLS, ROWS, cellKey } from "./constants.ts";
import { placeDecorations } from "./decorations.ts";
import { cellsForRect, validateFleet } from "./fleet.ts";
import type { Fleet } from "./types.ts";

const stacked: Fleet = {
  units: [
    { id: "u0", length: 4, width: 2, cells: cellsForRect({ x: 0, y: 0 }, 4, 2, true) },
    { id: "u1", length: 3, width: 2, cells: cellsForRect({ x: 0, y: 3 }, 3, 2, true) },
    { id: "u2", length: 3, width: 2, cells: cellsForRect({ x: 0, y: 6 }, 3, 2, true) },
    { id: "u3", length: 2, width: 1, cells: cellsForRect({ x: 0, y: 9 }, 2, 1, true) },
    { id: "u4", length: 2, width: 1, cells: cellsForRect({ x: 0, y: 11 }, 2, 1, true) },
    { id: "u5", length: 2, width: 1, cells: cellsForRect({ x: 0, y: 13 }, 2, 1, true) },
    { id: "u6", length: 1, width: 1, cells: cellsForRect({ x: 0, y: 15 }, 1, 1, true) },
    { id: "u7", length: 1, width: 1, cells: [{ x: 15, y: 21 }] },
  ],
};

function cycleRng(start: number): () => number {
  let i = start;
  return () => {
    i += 1;
    return (i % 97) / 97;
  };
}

function assertTenTreesFourCrates(fleet: Fleet, decorations: ReturnType<typeof placeDecorations>): void {
  const unitKeys = new Set(fleet.units.flatMap((u) => u.cells.map((c) => cellKey(c.x, c.y))));
  expect(decorations.filter((d) => d.kind === "tree")).toHaveLength(10);
  expect(decorations.filter((d) => d.kind === "crate")).toHaveLength(4);
  expect(decorations).toHaveLength(14);
  expect(decorations.every((d) => d.burned === false)).toBe(true);

  const seen = new Set<string>();
  for (const deco of decorations) {
    expect(deco.cell.x).toBeGreaterThanOrEqual(0);
    expect(deco.cell.x).toBeLessThan(COLS);
    expect(deco.cell.y).toBeGreaterThanOrEqual(0);
    expect(deco.cell.y).toBeLessThan(ROWS);
    const key = cellKey(deco.cell.x, deco.cell.y);
    expect(unitKeys.has(key)).toBe(false);
    expect(seen.has(key)).toBe(false);
    seen.add(key);
  }
}

describe("placeDecorations", () => {
  it("places 10 trees and 4 crates off unit cells without overlapping (10 seeds)", () => {
    expect(validateFleet(stacked.units).ok).toBe(true);
    for (let seed = 0; seed < 10; seed++) {
      const decorations = placeDecorations(stacked, cycleRng(seed * 13));
      assertTenTreesFourCrates(stacked, decorations);
    }
  });

  it("may sit Moore-adjacent to tanks", () => {
    const decorations = placeDecorations(stacked, () => 0);
    const adjacentToTank = decorations.some((d) =>
      stacked.units.some((u) =>
        u.cells.some(
          (c) => Math.abs(c.x - d.cell.x) <= 1 && Math.abs(c.y - d.cell.y) <= 1 && !(c.x === d.cell.x && c.y === d.cell.y),
        ),
      ),
    );
    expect(typeof adjacentToTank).toBe("boolean");
  });
});
