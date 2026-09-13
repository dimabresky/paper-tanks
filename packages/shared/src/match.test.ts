import { describe, expect, it } from "vitest";
import { cellsForAnchor, randomValidFleet, validateFleet } from "./fleet.ts";
import {
  applyFire,
  createMatch,
  occupySeat,
  placeFleet,
  setReady,
} from "./match.ts";
import type { Fleet, SeatId } from "./types.ts";

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
    const fa: Fleet = {
      units: [
        { id: "u0", length: 4, cells: cellsForAnchor(0, 0, 4, true) },
        { id: "u1", length: 3, cells: cellsForAnchor(0, 2, 3, true) },
        { id: "u2", length: 3, cells: cellsForAnchor(0, 4, 3, true) },
        { id: "u3", length: 2, cells: cellsForAnchor(0, 6, 2, true) },
        { id: "u4", length: 2, cells: cellsForAnchor(0, 8, 2, true) },
        { id: "u5", length: 2, cells: cellsForAnchor(0, 10, 2, true) },
        { id: "u6", length: 1, cells: cellsForAnchor(0, 12, 1, true) },
        { id: "u7", length: 1, cells: cellsForAnchor(0, 14, 1, true) },
      ],
    };
    const fb: Fleet = {
      units: [
        { id: "u0", length: 4, cells: cellsForAnchor(0, 0, 4, true) },
        { id: "u1", length: 3, cells: cellsForAnchor(0, 2, 3, true) },
        { id: "u2", length: 3, cells: cellsForAnchor(0, 4, 3, true) },
        { id: "u3", length: 2, cells: cellsForAnchor(0, 6, 2, true) },
        { id: "u4", length: 2, cells: cellsForAnchor(0, 8, 2, true) },
        { id: "u5", length: 2, cells: cellsForAnchor(0, 10, 2, true) },
        { id: "u6", length: 1, cells: cellsForAnchor(0, 12, 1, true) },
        { id: "u7", length: 1, cells: [{ x: 11, y: 15 }] },
      ],
    };
    expect(validateFleet(fa.units).ok).toBe(true);
    expect(validateFleet(fb.units).ok).toBe(true);
    placeFleet(state, "a", fa);
    placeFleet(state, "b", fb);
    setReady(state, "a");
    setReady(state, "b");
    state.turn = "a";

    const miss = applyFire(state, "a", { x: 5, y: 15 });
    expect(miss.result).toBe("miss");
    expect(state.turn).toBe("b");

    const hit = applyFire(state, "b", { x: 0, y: 0 });
    expect(hit.result).toBe("hit");
    expect(state.turn).toBe("b");

    expect(() => applyFire(state, "b", { x: 0, y: 0 })).toThrow(/уже стреляли/i);
  });

  it("marks sunk when the last cell of a unit is hit and wins when fleet is gone", () => {
    const state = createMatch();
    occupySeat(state, "a", "Аня", "ta");
    occupySeat(state, "b", "Боря", "tb");
    const tinyA: Fleet = {
      units: [
        { id: "u0", length: 4, cells: cellsForAnchor(0, 0, 4, true) },
        { id: "u1", length: 3, cells: cellsForAnchor(0, 2, 3, true) },
        { id: "u2", length: 3, cells: cellsForAnchor(0, 4, 3, true) },
        { id: "u3", length: 2, cells: cellsForAnchor(0, 6, 2, true) },
        { id: "u4", length: 2, cells: cellsForAnchor(0, 8, 2, true) },
        { id: "u5", length: 2, cells: cellsForAnchor(0, 10, 2, true) },
        { id: "u6", length: 1, cells: cellsForAnchor(0, 12, 1, true) },
        { id: "u7", length: 1, cells: cellsForAnchor(0, 14, 1, true) },
      ],
    };
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
});
