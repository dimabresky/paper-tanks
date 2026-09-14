import { describe, expect, it } from "vitest";
import { cellsForAnchor, validateFleet } from "./fleet.ts";
import { applyFire, createMatch, occupySeat, placeFleet, setReady } from "./match.ts";
import type { Fleet } from "./types.ts";
import { getPlayerView } from "./view.ts";

const stacked: Fleet = {
  units: [
    { id: "secret-b-0", length: 4, cells: cellsForAnchor(0, 0, 4, true) },
    { id: "secret-b-1", length: 3, cells: cellsForAnchor(0, 2, 3, true) },
    { id: "secret-b-2", length: 3, cells: cellsForAnchor(0, 4, 3, true) },
    { id: "secret-b-3", length: 2, cells: cellsForAnchor(0, 6, 2, true) },
    { id: "secret-b-4", length: 2, cells: cellsForAnchor(0, 8, 2, true) },
    { id: "secret-b-5", length: 2, cells: cellsForAnchor(0, 10, 2, true) },
    { id: "secret-b-6", length: 1, cells: cellsForAnchor(0, 12, 1, true) },
    { id: "secret-b-7", length: 1, cells: [{ x: 11, y: 15 }] },
  ],
};

const stackedA: Fleet = {
  units: stacked.units.map((u, i) => ({
    ...u,
    id: `a-${i}`,
    cells: u.cells.map((c) => ({ ...c })),
  })),
};
stackedA.units[7] = { id: "a-7", length: 1, cells: [{ x: 5, y: 15 }] };

describe("getPlayerView", () => {
  it("never includes opponent fleet ids or unfired unique cells", () => {
    expect(validateFleet(stacked.units).ok).toBe(true);
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
    expect(json).not.toMatch(/"x":11,"y":15/);

    applyFire(state, "a", { x: 11, y: 15 });
    const after = JSON.stringify(getPlayerView(state, "a"));
    expect(after).toContain('"x":11');
    expect(after).toContain('"y":15');
    expect(after).not.toContain("secret-b-");

    applyFire(state, "a", { x: 0, y: 0 });
    const partial = JSON.stringify(getPlayerView(state, "a"));
    expect(partial).not.toContain("secret-b-");
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
});
