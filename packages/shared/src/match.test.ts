import { describe, expect, it } from "vitest";
import { cellsForRect, randomValidFleet, validateFleet } from "./fleet.ts";
import {
  applyFire,
  createMatch,
  occupySeat,
  placeFleet,
  setReady,
  voteRematch,
} from "./match.ts";
import type { Cell, Fleet, SeatId, Unit } from "./types.ts";

function rect(
  id: string,
  length: 1 | 2 | 3 | 4,
  width: 1 | 2,
  x: number,
  y: number,
  last?: Cell,
): Unit {
  if (last) return { id, length, width, cells: [last] };
  return { id, length, width, cells: cellsForRect({ x, y }, length, width, true) };
}

function stackedFleet(prefix: string, last?: Cell): Fleet {
  return {
    units: [
      rect(`${prefix}0`, 4, 2, 0, 0),
      rect(`${prefix}1`, 3, 2, 0, 3),
      rect(`${prefix}2`, 3, 2, 0, 6),
      rect(`${prefix}3`, 2, 1, 0, 9),
      rect(`${prefix}4`, 2, 1, 0, 11),
      rect(`${prefix}5`, 2, 1, 0, 13),
      rect(`${prefix}6`, 1, 1, 0, 15),
      rect(`${prefix}7`, 1, 1, last?.x ?? 0, last?.y ?? 17, last),
    ],
  };
}

function readyMatch(): ReturnType<typeof createMatch> {
  const state = createMatch();
  occupySeat(state, "a", "Аня", "ta");
  occupySeat(state, "b", "Боря", "tb");
  const fa = randomValidFleet();
  const fb = randomValidFleet();
  placeFleet(state, "a", fa);
  placeFleet(state, "b", fb);
  setReady(state, "a");
  setReady(state, "b");
  return state;
}

describe("applyFire", () => {
  it("keeps the turn on hit and passes it on miss", () => {
    const state = createMatch();
    occupySeat(state, "a", "Аня", "ta");
    occupySeat(state, "b", "Боря", "tb");
    const fa = stackedFleet("a", { x: 0, y: 17 });
    const fb = stackedFleet("b", { x: 15, y: 21 });
    expect(validateFleet(fa.units).ok).toBe(true);
    expect(validateFleet(fb.units).ok).toBe(true);
    placeFleet(state, "a", fa);
    placeFleet(state, "b", fb);
    setReady(state, "a");
    setReady(state, "b");
    state.turn = "a";
    state.seats.a!.decorations = [];
    state.seats.b!.decorations = [];

    const miss = applyFire(state, "a", { x: 5, y: 20 });
    expect(miss.result).toBe("miss");
    expect(miss.cause).toBe("fire");
    expect(state.turn).toBe("b");

    const hit = applyFire(state, "b", { x: 0, y: 0 });
    expect(hit.result).toBe("hit");
    expect(state.turn).toBe("b");

    expect(() => applyFire(state, "b", { x: 0, y: 0 })).toThrow(/уже стреляли/i);
  });

  it("fires one cell of a 2×4 as hit, then sunk after the other seven", () => {
    const state = createMatch();
    occupySeat(state, "a", "Аня", "ta");
    occupySeat(state, "b", "Боря", "tb");
    const fleet = stackedFleet("u");
    placeFleet(state, "a", fleet);
    placeFleet(state, "b", fleet);
    setReady(state, "a");
    setReady(state, "b");
    state.turn = "a";
    state.seats.a!.decorations = [];
    state.seats.b!.decorations = [];

    const cells = fleet.units[0]!.cells;
    const first = applyFire(state, "a", cells[0]!);
    expect(first.result).toBe("hit");
    expect(state.turn).toBe("a");
    for (let i = 1; i < cells.length; i++) {
      const shot = applyFire(state, "a", cells[i]!);
      if (i < cells.length - 1) {
        expect(shot.result).toBe("hit");
        expect(state.turn).toBe("a");
      } else {
        expect(shot.result).toBe("sunk");
      }
    }
  });

  it("marks sunk when the last cell of a unit is hit and wins when fleet is gone", () => {
    const state = createMatch();
    occupySeat(state, "a", "Аня", "ta");
    occupySeat(state, "b", "Боря", "tb");
    const tinyA = stackedFleet("u");
    placeFleet(state, "a", tinyA);
    placeFleet(state, "b", tinyA);
    setReady(state, "a");
    setReady(state, "b");
    state.turn = "a";

    const cells = tinyA.units.flatMap((u) => u.cells);
    for (let i = 0; i < cells.length; i++) {
      const shot = applyFire(state, "a", cells[i]!);
      if (i < cells.length - 1) {
        expect(state.phase).toBe("battle");
        expect(state.turn).toBe("a");
        expect(["hit", "sunk"]).toContain(shot.result);
      } else {
        expect(shot.result).toBe("sunk");
        expect(state.phase).toBe("ended");
        expect(state.winner).toBe("a");
      }
    }
  });

  it("rejects fire out of turn", () => {
    const state = readyMatch();
    const waiter = (["a", "b"] as SeatId[]).find((s) => s !== state.turn)!;
    expect(() => applyFire(state, waiter, { x: 0, y: 0 })).toThrow(/ход соперника/i);
  });

  it("opens a tree, marks it burned, and passes the turn", () => {
    const state = createMatch();
    occupySeat(state, "a", "Аня", "ta");
    occupySeat(state, "b", "Боря", "tb");
    const fleet = stackedFleet("u", { x: 15, y: 21 });
    placeFleet(state, "a", fleet);
    placeFleet(state, "b", fleet);
    setReady(state, "a");
    setReady(state, "b");
    state.turn = "a";
    state.seats.a!.decorations = [];
    state.seats.b!.decorations = [
      { id: "tree-1", kind: "tree", cell: { x: 5, y: 5 }, burned: false },
    ];

    const shot = applyFire(state, "a", { x: 5, y: 5 });
    expect(shot.result).toBe("tree");
    expect(shot.cause).toBe("fire");
    expect(state.turn).toBe("b");
    expect(state.seats.b!.decorations[0]?.burned).toBe(true);
  });

  it("blasts 2–4 unopened Moore cells from a crate and does not chain nested crates", () => {
    const state = createMatch();
    occupySeat(state, "a", "Аня", "ta");
    occupySeat(state, "b", "Боря", "tb");
    const fleet = stackedFleet("u", { x: 15, y: 21 });
    placeFleet(state, "a", fleet);
    placeFleet(state, "b", fleet);
    setReady(state, "a");
    setReady(state, "b");
    state.turn = "a";
    state.seats.a!.decorations = [];
    state.seats.b!.decorations = [
      { id: "crate-1", kind: "crate", cell: { x: 6, y: 6 }, burned: false },
      { id: "crate-2", kind: "crate", cell: { x: 5, y: 5 }, burned: false },
    ];

    const rng = () => 0.999;
    const primary = applyFire(state, "a", { x: 6, y: 6 }, Date.now(), rng);
    expect(primary.result).toBe("crate");
    const mine = state.shots.filter((s) => s.by === "a");
    const blasts = mine.filter((s) => s.cause === "blast");
    expect(blasts.length).toBeGreaterThanOrEqual(2);
    expect(blasts.length).toBeLessThanOrEqual(4);
    expect(blasts.every((s) => Math.abs(s.cell.x - 6) <= 1 && Math.abs(s.cell.y - 6) <= 1)).toBe(
      true,
    );
    const nested = mine.find((s) => s.cell.x === 5 && s.cell.y === 5);
    expect(nested?.result).toBe("crate");
    expect(mine.some((s) => s.cell.x === 4 && s.cell.y === 4)).toBe(false);
    state.turn = "a";
    expect(() => applyFire(state, "a", { x: 6, y: 6 })).toThrow(/уже стреляли/i);
    const blasted = blasts[0]!;
    expect(() => applyFire(state, "a", blasted.cell)).toThrow(/уже стреляли/i);
  });

  it("keeps the turn when a crate blast hits a tank", () => {
    const state = createMatch();
    occupySeat(state, "a", "Аня", "ta");
    occupySeat(state, "b", "Боря", "tb");
    const fleetA = stackedFleet("a", { x: 15, y: 21 });
    const fleetB = stackedFleet("b", { x: 5, y: 14 });
    placeFleet(state, "a", fleetA);
    placeFleet(state, "b", fleetB);
    setReady(state, "a");
    setReady(state, "b");
    state.turn = "a";
    state.seats.a!.decorations = [];
    state.seats.b!.decorations = [{ id: "crate-1", kind: "crate", cell: { x: 5, y: 15 }, burned: false }];

    const rng = () => 0;
    applyFire(state, "a", { x: 5, y: 15 }, Date.now(), rng);
    const damaged = state.shots.some((s) => s.result === "hit" || s.result === "sunk");
    if (damaged) expect(state.turn).toBe("a");
    else expect(state.turn).toBe("b");
    const blasts = state.shots.filter((s) => s.cause === "blast");
    expect(blasts.length).toBeGreaterThanOrEqual(2);
  });

  it("clears fleets and decorations on rematch", () => {
    const state = readyMatch();
    state.phase = "ended";
    state.seats.a!.decorations = [{ id: "tree-0", kind: "tree", cell: { x: 3, y: 3 }, burned: false }];
    voteRematch(state, "a");
    voteRematch(state, "b");
    expect(state.phase).toBe("placement");
    expect(state.seats.a?.fleet).toBeNull();
    expect(state.seats.b?.fleet).toBeNull();
    expect(state.seats.a?.decorations).toEqual([]);
    expect(state.seats.b?.decorations).toEqual([]);
  });

  it("places 10 trees and 4 crates per seat after rematch and both ready again", () => {
    const state = readyMatch();
    state.phase = "ended";
    voteRematch(state, "a");
    voteRematch(state, "b");
    expect(state.seats.a?.decorations).toEqual([]);
    expect(state.seats.b?.decorations).toEqual([]);

    placeFleet(state, "a", randomValidFleet());
    placeFleet(state, "b", randomValidFleet());
    setReady(state, "a");
    setReady(state, "b");

    for (const seat of ["a", "b"] as const) {
      const deco = state.seats[seat]!.decorations;
      expect(deco).toHaveLength(14);
      expect(deco.filter((d) => d.kind === "tree")).toHaveLength(10);
      expect(deco.filter((d) => d.kind === "crate")).toHaveLength(4);
      expect(deco.every((d) => d.burned === false)).toBe(true);
    }
  });
});

