import { COLS, FLEET_SHAPES, ROWS, cellKey, widthForLength } from "./constants.ts";
import type { Cell, Fleet, Unit } from "./types.ts";

export function inBounds(cell: Cell): boolean {
  return cell.x >= 0 && cell.x < COLS && cell.y >= 0 && cell.y < ROWS;
}

export function unitOrigin(unit: Unit): Cell {
  return {
    x: Math.min(...unit.cells.map((c) => c.x)),
    y: Math.min(...unit.cells.map((c) => c.y)),
  };
}

export function isUnitHorizontal(unit: Unit): boolean {
  const xs = unit.cells.map((c) => c.x);
  const ys = unit.cells.map((c) => c.y);
  const spanX = Math.max(...xs) - Math.min(...xs) + 1;
  const spanY = Math.max(...ys) - Math.min(...ys) + 1;
  return spanX === unit.length && spanY === unit.width;
}

export function cellsForRect(
  origin: Cell,
  length: 1 | 2 | 3 | 4,
  width: 1 | 2,
  horizontal: boolean,
): Cell[] {
  const spanX = horizontal ? length : width;
  const spanY = horizontal ? width : length;
  const cells: Cell[] = [];
  for (let dy = 0; dy < spanY; dy++) {
    for (let dx = 0; dx < spanX; dx++) {
      cells.push({ x: origin.x + dx, y: origin.y + dy });
    }
  }
  return cells;
}

export function isOrthogonalRectangle(unit: Unit): boolean {
  if (unit.width !== widthForLength(unit.length)) return false;
  if (unit.cells.length !== unit.length * unit.width) return false;
  if (unit.cells.some((c) => !inBounds(c))) return false;
  const keys = unit.cells.map((c) => cellKey(c.x, c.y));
  if (new Set(keys).size !== unit.cells.length) return false;
  const xs = unit.cells.map((c) => c.x);
  const ys = unit.cells.map((c) => c.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX + 1;
  const spanY = maxY - minY + 1;
  const horizontal = spanX === unit.length && spanY === unit.width;
  const vertical = spanX === unit.width && spanY === unit.length;
  if (!horizontal && !vertical) return false;
  const filled = new Set(keys);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (!filled.has(cellKey(x, y))) return false;
    }
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

export function canAddUnit(existing: Unit[], unit: Unit): boolean {
  if (![1, 2, 3, 4].includes(unit.length)) return false;
  if (!isOrthogonalRectangle(unit)) return false;
  return existing.every((e) => !unitsTouchOrOverlap(e, unit));
}

function shapeKey(unit: Pick<Unit, "length" | "width">): string {
  return `${unit.length}x${unit.width}`;
}

export function validateFleet(
  units: Unit[],
): { ok: true } | { ok: false; error: string } {
  const expected = FLEET_SHAPES.map((s) => shapeKey(s)).sort();
  const actual = units.map((u) => shapeKey(u)).sort();
  if (expected.length !== actual.length || expected.some((k, i) => k !== actual[i])) {
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

/** Flipped rectangle around the bounding-box centre; may be out of bounds or overlapping. */
export function flipUnit(unit: Unit): Unit {
  const xs = unit.cells.map((c) => c.x);
  const ys = unit.cells.map((c) => c.y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const nextHorizontal = !isUnitHorizontal(unit);
  const spanX = nextHorizontal ? unit.length : unit.width;
  const spanY = nextHorizontal ? unit.width : unit.length;
  const origin = {
    x: Math.round(cx - (spanX - 1) / 2),
    y: Math.round(cy - (spanY - 1) / 2),
  };
  return {
    ...unit,
    cells: cellsForRect(origin, unit.length, unit.width, nextHorizontal),
  };
}

export function rotateUnit(unit: Unit, others: Unit[] = []): Unit | null {
  const rotated = flipUnit(unit);
  if (!canAddUnit(others, rotated)) return null;
  return rotated;
}

export function randomValidFleet(rng: () => number = Math.random): Fleet {
  for (let attempt = 0; attempt < 400; attempt++) {
    const units: Unit[] = [];
    let failed = false;
    for (let i = 0; i < FLEET_SHAPES.length; i++) {
      const shape = FLEET_SHAPES[i]!;
      const unit = tryPlace(shape.length, shape.width, units, rng, i);
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
  width: 1 | 2,
  existing: Unit[],
  rng: () => number,
  index: number,
): Unit | null {
  for (let n = 0; n < 160; n++) {
    const horizontal = rng() < 0.5;
    const spanX = horizontal ? length : width;
    const spanY = horizontal ? width : length;
    const maxX = COLS - spanX;
    const maxY = ROWS - spanY;
    if (maxX < 0 || maxY < 0) return null;
    const x = Math.floor(rng() * (maxX + 1));
    const y = Math.floor(rng() * (maxY + 1));
    const unit: Unit = {
      id: `u${index}`,
      length,
      width,
      cells: cellsForRect({ x, y }, length, width, horizontal),
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
