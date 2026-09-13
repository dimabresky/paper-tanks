import { COLS, FLEET_LENGTHS, ROWS, cellKey } from "./constants.ts";
import type { Cell, Fleet, Unit } from "./types.ts";

export function inBounds(cell: Cell): boolean {
  return cell.x >= 0 && cell.x < COLS && cell.y >= 0 && cell.y < ROWS;
}

export function isOrthogonalContiguous(unit: Unit): boolean {
  if (unit.cells.length !== unit.length) return false;
  if (unit.cells.some((c) => !inBounds(c))) return false;
  if (unit.length === 1) return true;
  const xs = unit.cells.map((c) => c.x).sort((a, b) => a - b);
  const ys = unit.cells.map((c) => c.y).sort((a, b) => a - b);
  const sameRow = ys.every((y) => y === ys[0]);
  const sameCol = xs.every((x) => x === xs[0]);
  if (sameRow === sameCol) return false;
  const axis = sameRow ? xs : ys;
  for (let i = 1; i < axis.length; i++) {
    if (axis[i] !== axis[i - 1]! + 1) return false;
  }
  return true;
}

function unitCellSet(unit: Unit): Set<string> {
  return new Set(unit.cells.map((c) => cellKey(c.x, c.y)));
}

export function unitsTouchOrOverlap(a: Unit, b: Unit): boolean {
  const bset = unitCellSet(b);
  for (const cell of a.cells) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (bset.has(cellKey(cell.x + dx, cell.y + dy))) return true;
      }
    }
  }
  return false;
}

export function cellsForAnchor(
  x: number,
  y: number,
  length: 1 | 2 | 3 | 4,
  horizontal: boolean,
): Cell[] {
  return Array.from({ length }, (_, i) =>
    horizontal ? { x: x + i, y } : { x, y: y + i },
  );
}

export function canAddUnit(existing: Unit[], unit: Unit): boolean {
  if (![1, 2, 3, 4].includes(unit.length)) return false;
  if (!isOrthogonalContiguous(unit)) return false;
  return existing.every((e) => !unitsTouchOrOverlap(e, unit));
}

export function validateFleet(
  units: Unit[],
): { ok: true } | { ok: false; error: string } {
  const lengths = units.map((u) => u.length).sort((a, b) => b - a);
  const expected = [...FLEET_LENGTHS].sort((a, b) => b - a);
  if (lengths.length !== expected.length || lengths.some((l, i) => l !== expected[i])) {
    return { ok: false, error: "Танки пересекаются или вылезают с листа" };
  }
  const ids = new Set<string>();
  for (const unit of units) {
    if (ids.has(unit.id)) return { ok: false, error: "Танки пересекаются или вылезают с листа" };
    ids.add(unit.id);
  }
  const placed: Unit[] = [];
  for (const unit of units) {
    if (!canAddUnit(placed, unit)) {
      return { ok: false, error: "Танки пересекаются или вылезают с листа" };
    }
    placed.push(unit);
  }
  return { ok: true };
}

export function randomValidFleet(rng: () => number = Math.random): Fleet {
  for (let attempt = 0; attempt < 400; attempt++) {
    const units: Unit[] = [];
    let failed = false;
    for (let i = 0; i < FLEET_LENGTHS.length; i++) {
      const length = FLEET_LENGTHS[i]!;
      const unit = tryPlace(length, units, rng, i);
      if (!unit) {
        failed = true;
        break;
      }
      units.push(unit);
    }
    if (!failed && validateFleet(units).ok) return { units };
  }
  throw new Error("Не удалось расставить флот");
}

function tryPlace(
  length: 1 | 2 | 3 | 4,
  existing: Unit[],
  rng: () => number,
  index: number,
): Unit | null {
  for (let n = 0; n < 120; n++) {
    const horizontal = rng() < 0.5;
    const maxX = horizontal ? COLS - length : COLS - 1;
    const maxY = horizontal ? ROWS - 1 : ROWS - length;
    const x = Math.floor(rng() * (maxX + 1));
    const y = Math.floor(rng() * (maxY + 1));
    const unit: Unit = {
      id: `u${index}`,
      length,
      cells: cellsForAnchor(x, y, length, horizontal),
    };
    if (canAddUnit(existing, unit)) return unit;
  }
  return null;
}

export function tanksLeft(fleet: Fleet | null, hitsOnFleet: Cell[]): number {
  if (!fleet) return 0;
  const hit = new Set(hitsOnFleet.map((c) => cellKey(c.x, c.y)));
  return fleet.units.filter((u) => u.cells.some((c) => !hit.has(cellKey(c.x, c.y)))).length;
}

export function unitAt(fleet: Fleet, cell: Cell): Unit | undefined {
  return fleet.units.find((u) =>
    u.cells.some((c) => c.x === cell.x && c.y === cell.y),
  );
}

export function isUnitSunk(unit: Unit, hitsOnFleet: Cell[]): boolean {
  const hit = new Set(hitsOnFleet.map((c) => cellKey(c.x, c.y)));
  return unit.cells.every((c) => hit.has(cellKey(c.x, c.y)));
}
