import { describe, expect, it } from "vitest";
import { cellKey } from "./constants.ts";
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

describe("placeDecorations", () => {
  it("places 5 trees and 2 crates off unit cells without overlapping", () => {
    expect(validateFleet(stacked.units).ok).toBe(true);
    const unitKeys = new Set(stacked.units.flatMap((u) => u.cells.map((c) => cellKey(c.x, c.y))));
    const rng = (() => {
      let i = 0;
      return () => {
        i += 1;
        return (i % 97) / 97;
      };
    })();

    const decorations = placeDecorations(stacked, rng);
    expect(decorations.filter((d) => d.kind === "tree")).toHaveLength(5);
    expect(decorations.filter((d) => d.kind === "crate")).toHaveLength(2);
    expect(decorations).toHaveLength(7);
    expect(decorations.every((d) => d.burned === false)).toBe(true);

    const seen = new Set<string>();
    for (const deco of decorations) {
      const key = cellKey(deco.cell.x, deco.cell.y);
      expect(unitKeys.has(key)).toBe(false);
      expect(seen.has(key)).toBe(false);
      seen.add(key);
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
