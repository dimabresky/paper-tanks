/** 16×22 notebook page. Columns А–П including Й, skipping Ё. */
export const COLS = 16;
export const ROWS = 22;
export const COL_LETTERS = "АБВГДЕЖЗИЙКЛМНОП";

export const FLEET_SHAPES = [
  { length: 4, width: 2 },
  { length: 3, width: 2 },
  { length: 3, width: 2 },
  { length: 2, width: 1 },
  { length: 2, width: 1 },
  { length: 2, width: 1 },
  { length: 1, width: 1 },
  { length: 1, width: 1 },
] as const;

export type FleetShape = (typeof FLEET_SHAPES)[number];

/** Length column of FLEET_SHAPES (one 4, two 3s, three 2s, two 1s). */
export const FLEET_LENGTHS = FLEET_SHAPES.map((s) => s.length);

function envPort(): string | undefined {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return proc?.env?.PORT;
}

export const PORT = Number.parseInt(envPort() || "8787", 10) || 8787;
export const DISCONNECT_MS = 60_000;
export const NICK_MAX = 24;
export const PING_MS = 15_000;

export function colLetter(x: number): string {
  return COL_LETTERS[x] ?? "?";
}

export function cellLabel(x: number, y: number): string {
  return `${colLetter(x)}${y + 1}`;
}

export function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function otherSeat(seat: "a" | "b"): "a" | "b" {
  return seat === "a" ? "b" : "a";
}

export function sanitizeNick(raw: string | undefined, fallback: string): string {
  const trimmed = (raw ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, NICK_MAX);
  return trimmed.length > 0 ? trimmed : fallback;
}

export function widthForLength(length: 1 | 2 | 3 | 4): 1 | 2 {
  return length >= 3 ? 2 : 1;
}

export function shapeTag(length: number, width: number): "2x4" | "2x3" | "1x2" | "1x1" {
  return `${width}x${length}` as "2x4" | "2x3" | "1x2" | "1x1";
}
