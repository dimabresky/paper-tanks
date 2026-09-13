import { describe, expect, it } from "vitest";
import { FLEET_LENGTHS } from "./constants.ts";
import {
  canAddUnit,
  cellsForAnchor,
  randomValidFleet,
  validateFleet,
} from "./fleet.ts";
import type { Unit } from "./types.ts";

function unit(id: string, length: 1 | 2 | 3 | 4, x: number, y: number, horizontal: boolean): Unit {
  return { id, length, cells: cellsForAnchor(x, y, length, horizontal) };
}

describe("validateFleet", () => {
  it("accepts a random valid fleet", () => {
    const fleet = randomValidFleet();
    expect(validateFleet(fleet.units).ok).toBe(true);
    expect(fleet.units.map((u) => u.length).sort((a, b) => b - a)).toEqual(
      [...FLEET_LENGTHS].sort((a, b) => b - a),
    );
    expect(fleet.units.reduce((n, u) => n + u.cells.length, 0)).toBe(18);
  });

  it("rejects diagonal touch (Moore-8)", () => {
    const a = unit("a", 1, 0, 0, true);
    const b = unit("b", 1, 1, 1, true);
    expect(canAddUnit([a], b)).toBe(false);
  });

  it("rejects out of bounds", () => {
    const u: Unit = { id: "x", length: 4, cells: cellsForAnchor(10, 0, 4, true) };
    expect(canAddUnit([], u)).toBe(false);
  });

  it("rejects wrong composition", () => {
    const units = FLEET_LENGTHS.map((length, i) => unit(`u${i}`, length, 0, i * 2, true));
    units[0] = unit("u0", 3, 0, 0, true);
    expect(validateFleet(units).ok).toBe(false);
  });

  it("always generates valid random fleets", () => {
    for (let i = 0; i < 30; i++) {
      expect(validateFleet(randomValidFleet().units).ok).toBe(true);
    }
  });
});
