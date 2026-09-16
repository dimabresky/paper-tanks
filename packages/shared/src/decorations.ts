import { COLS, ROWS, cellKey } from "./constants.ts";
import { inBounds } from "./fleet.ts";
import type { Cell, Decoration, DecorationKind, Fleet } from "./types.ts";

const TREE_COUNT = 10;
const CRATE_COUNT = 4;
const DECORATION_COUNT = TREE_COUNT + CRATE_COUNT;

export function mooreNeighbors(cell: Cell): Cell[] {
  const out: Cell[] = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      const next = { x: cell.x + dx, y: cell.y + dy };
      if (inBounds(next)) out.push(next);
    }
  }
  return out;
}

export function placeDecorations(fleet: Fleet, rng: () => number = Math.random): Decoration[] {
  const blocked = new Set(fleet.units.flatMap((u) => u.cells.map((c) => cellKey(c.x, c.y))));
  const free: Cell[] = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!blocked.has(cellKey(x, y))) free.push({ x, y });
    }
  }

  for (let attempt = 0; attempt < 200; attempt++) {
    const picked = shuffle(free, rng).slice(0, DECORATION_COUNT);
    if (picked.length < DECORATION_COUNT) continue;
    const keys = picked.map((c) => cellKey(c.x, c.y));
    if (new Set(keys).size !== DECORATION_COUNT) continue;
    if (keys.some((k) => blocked.has(k))) continue;
    const kinds: DecorationKind[] = [
      ...Array.from({ length: TREE_COUNT }, () => "tree" as const),
      ...Array.from({ length: CRATE_COUNT }, () => "crate" as const),
    ];
    return picked.map((cell, i) => ({
      id: `${kinds[i]}-${i}`,
      kind: kinds[i]!,
      cell: { ...cell },
      burned: false,
    }));
  }

  throw new Error("Не удалось расставить декорации");
}

export function shuffle<T>(items: T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = a;
  }
  return copy;
}
