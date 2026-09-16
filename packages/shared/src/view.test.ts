import { describe, expect, it } from "vitest";
import { cellsForRect, validateFleet } from "./fleet.ts";
import { applyFire, createMatch, occupySeat, placeFleet, setReady } from "./match.ts";
import type { Cell, Fleet, Unit } from "./types.ts";
import { getPlayerView } from "./view.ts";

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

function stackedAt(
  prefix: string,
  four: Cell,
  last: Cell,
): Fleet {
  const fourCells = cellsForRect(four, 4, 2, true);
  return {
    units: [
      { id: `${prefix}0`, length: 4, width: 2, cells: fourCells },
      rect(`${prefix}1`, 3, 2, 0, 3),
      rect(`${prefix}2`, 3, 2, 0, 6),
      rect(`${prefix}3`, 2, 1, 0, 9),
      rect(`${prefix}4`, 2, 1, 0, 11),
      rect(`${prefix}5`, 2, 1, 0, 13),
      rect(`${prefix}6`, 1, 1, 0, 15),
      rect(`${prefix}7`, 1, 1, last.x, last.y, last),
    ],
  };
}

const stacked: Fleet = stackedAt("secret-b-", { x: 12, y: 0 }, { x: 15, y: 21 });
const stackedA: Fleet = stackedAt("a-", { x: 0, y: 0 }, { x: 8, y: 21 });

describe("getPlayerView", () => {
  it("never includes opponent fleet ids or unfired unique cells", () => {
    expect(validateFleet(stacked.units).ok).toBe(true);
    expect(validateFleet(stackedA.units).ok).toBe(true);
    const state = createMatch();
    occupySeat(state, "a", "Аня", "ta");
    occupySeat(state, "b", "Боря", "tb");
    placeFleet(state, "a", stackedA);
    placeFleet(state, "b", stacked);
    setReady(state, "a");
    setReady(state, "b");
    state.turn = "a";
    state.seats.a!.decorations = [];
    state.seats.b!.decorations = [];

    const viewA = getPlayerView(state, "a");
    const json = JSON.stringify(viewA);
    expect(json).not.toContain("secret-b-");
    expect(viewA.yourDecorations).toEqual([]);
    expect(viewA.yourFleet?.units.some((u) => u.id.startsWith("a-"))).toBe(true);
    expect(viewA.phase).toBe("battle");
    expect(viewA.turn).toBe("a");
    expect(viewA.yourTanksLeft).toBe(8);
    expect(viewA.opponentTanksLeft).toBe(8);
    expect(json).not.toMatch(/"x":15,"y":21/);

    applyFire(state, "a", { x: 15, y: 21 });
    const after = JSON.stringify(getPlayerView(state, "a"));
    expect(after).toContain('"x":15');
    expect(after).toContain('"y":21');
    expect(after).not.toContain("secret-b-");
  });

  it("does not serialize the other seven cells of B’s 2×4 after one hit", () => {
    const state = createMatch();
    occupySeat(state, "a", "Аня", "ta");
    occupySeat(state, "b", "Боря", "tb");
    placeFleet(state, "a", stackedA);
    placeFleet(state, "b", stacked);
    setReady(state, "a");
    setReady(state, "b");
    state.turn = "a";
    state.seats.a!.decorations = [];
    state.seats.b!.decorations = [];

    applyFire(state, "a", { x: 12, y: 0 });
    const view = getPlayerView(state, "a");
    const opened = new Set(view.shotsYouFired.map((s) => `${s.cell.x},${s.cell.y}`));
    expect(opened.has("12,0")).toBe(true);
    const siblings = stacked.units[0]!.cells.filter((c) => !(c.x === 12 && c.y === 0));
    expect(siblings).toHaveLength(7);
    for (const cell of siblings) {
      expect(opened.has(`${cell.x},${cell.y}`)).toBe(false);
      const inOwn = view.yourFleet?.units.some((u) =>
        u.cells.some((p) => p.x === cell.x && p.y === cell.y),
      );
      expect(inOwn).toBe(false);
    }
    expect(JSON.stringify(view)).not.toContain("secret-b-");
  });

  it("hides opponent decoration cells until they appear in shotsYouFired", () => {
    const state = createMatch();
    occupySeat(state, "a", "Аня", "ta");
    occupySeat(state, "b", "Боря", "tb");
    placeFleet(state, "a", stackedA);
    placeFleet(state, "b", stacked);
    setReady(state, "a");
    setReady(state, "b");
    state.turn = "a";
    state.seats.a!.decorations = [];
    state.seats.b!.decorations = [
      { id: "hidden-tree", kind: "tree", cell: { x: 9, y: 9 }, burned: false },
    ];

    const before = JSON.stringify(getPlayerView(state, "a"));
    expect(before).not.toContain("hidden-tree");
    expect(before).not.toContain("9:9");
    expect(before).not.toMatch(/"x":9,"y":9/);

    applyFire(state, "a", { x: 9, y: 9 });
    const after = getPlayerView(state, "a");
    const afterJson = JSON.stringify(after);
    expect(afterJson).not.toContain("hidden-tree");
    expect(
      after.shotsYouFired.some((s) => s.cell.x === 9 && s.cell.y === 9 && s.result === "tree"),
    ).toBe(true);
  });

  it("lists 10 own trees and 4 own crates after battle start without leaking B’s unrevealed décor cells", () => {
    expect(validateFleet(stacked.units).ok).toBe(true);
    expect(validateFleet(stackedA.units).ok).toBe(true);
    const state = createMatch();
    occupySeat(state, "a", "Аня", "ta");
    occupySeat(state, "b", "Боря", "tb");
    placeFleet(state, "a", stackedA);
    placeFleet(state, "b", stacked);
    let i = 0;
    const rng = () => {
      i += 1;
      return (i % 97) / 97;
    };
    setReady(state, "a", Date.now(), rng);
    setReady(state, "b", Date.now(), rng);

    const viewA = getPlayerView(state, "a");
    expect(viewA.yourDecorations.filter((d) => d.kind === "tree")).toHaveLength(10);
    expect(viewA.yourDecorations.filter((d) => d.kind === "crate")).toHaveLength(4);
    expect(viewA.yourDecorations).toHaveLength(14);

    const json = JSON.stringify(viewA);
    const ownKeys = new Set([
      ...viewA.yourDecorations.map((d) => `${d.cell.x},${d.cell.y}`),
      ...(viewA.yourFleet?.units.flatMap((u) => u.cells.map((c) => `${c.x},${c.y}`)) ?? []),
    ]);
    for (const deco of state.seats.b!.decorations) {
      const key = `${deco.cell.x},${deco.cell.y}`;
      if (ownKeys.has(key)) continue;
      expect(json).not.toMatch(new RegExp(`"x":${deco.cell.x},"y":${deco.cell.y}`));
    }
  });
});

