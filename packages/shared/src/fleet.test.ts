import { describe, expect, it } from "vitest";
import { FLEET_SHAPES } from "./constants.ts";
import {
  canAddUnit,
  cellsForRect,
  flipUnit,
  randomValidFleet,
  rotateUnit,
  validateFleet,
} from "./fleet.ts";
import type { Unit } from "./types.ts";

function rect(
  id: string,
  length: 1 | 2 | 3 | 4,
  width: 1 | 2,
  x: number,
  y: number,
  horizontal = true,
): Unit {
  return { id, length, width, cells: cellsForRect({ x, y }, length, width, horizontal) };
}

function stacked(prefix = "u"): Unit[] {
  return [
    rect(`${prefix}0`, 4, 2, 0, 0),
    rect(`${prefix}1`, 3, 2, 0, 3),
    rect(`${prefix}2`, 3, 2, 0, 6),
    rect(`${prefix}3`, 2, 1, 0, 9),
    rect(`${prefix}4`, 2, 1, 0, 11),
    rect(`${prefix}5`, 2, 1, 0, 13),
    rect(`${prefix}6`, 1, 1, 0, 15),
    rect(`${prefix}7`, 1, 1, 0, 17),
  ];
}

describe("validateFleet", () => {
  it("accepts a 28-cell FLEET_SHAPES rectangle fleet", () => {
    const fleet = randomValidFleet();
    expect(validateFleet(fleet.units).ok).toBe(true);
    expect(fleet.units.map((u) => `${u.length}x${u.width}`).sort()).toEqual(
      FLEET_SHAPES.map((s) => `${s.length}x${s.width}`).sort(),
    );
    expect(fleet.units.reduce((n, u) => n + u.cells.length, 0)).toBe(28);
    expect(validateFleet(stacked()).ok).toBe(true);
  });

  it("rejects the old 1×4 line as the four", () => {
    const units = stacked();
    units[0] = {
      id: "u0",
      length: 4,
      width: 1,
      cells: cellsForRect({ x: 0, y: 0 }, 4, 1, true),
    };
    expect(validateFleet(units).ok).toBe(false);
    expect(canAddUnit([], units[0]!)).toBe(false);
  });

  it("rejects diagonal touch (Moore-8)", () => {
    const a = rect("a", 1, 1, 0, 0);
    const b = rect("b", 1, 1, 1, 1);
    expect(canAddUnit([a], b)).toBe(false);
  });

  it("rejects out of bounds", () => {
    const u = rect("x", 4, 2, 13, 0);
    expect(canAddUnit([], u)).toBe(false);
  });

  it("rejects wrong composition", () => {
    const units = stacked();
    units[0] = rect("u0", 3, 2, 0, 0);
    expect(validateFleet(units).ok).toBe(false);
  });

  it("rotateUnit swaps 2×4 ↔ 4×2 around the bounding-box centre", () => {
    const unit = rect("r", 4, 2, 4, 8, true);
    const rotated = rotateUnit(unit, []);
    expect(rotated).not.toBeNull();
    const xs = rotated!.cells.map((c) => c.x);
    const ys = rotated!.cells.map((c) => c.y);
    expect(Math.max(...xs) - Math.min(...xs) + 1).toBe(2);
    expect(Math.max(...ys) - Math.min(...ys) + 1).toBe(4);
    expect(rotated!.cells).toHaveLength(8);
    const back = rotateUnit(rotated!, []);
    expect(back?.cells).toEqual(unit.cells);
  });

  it("rotateUnit returns null when the flip leaves the sheet", () => {
    const unit = rect("edge", 4, 2, 0, 0, true);
    expect(rotateUnit(unit, [])).toBeNull();
    const preview = flipUnit(unit);
    expect(preview.cells).toHaveLength(8);
    expect(Math.max(...preview.cells.map((c) => c.y)) - Math.min(...preview.cells.map((c) => c.y)) + 1).toBe(4);
  });

  it("always generates valid random fleets on 16×22", () => {
    for (let i = 0; i < 20; i++) {
      expect(validateFleet(randomValidFleet().units).ok).toBe(true);
    }
  });
});
