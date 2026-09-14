/** 12×16 notebook page. Columns А–Л including Й, skipping Ё. */
export const COLS = 12;
export const ROWS = 16;
export const COL_LETTERS = "АБВГДЕЖЗИЙКЛ";
export const FLEET_LENGTHS = [4, 3, 3, 2, 2, 2, 1, 1] as const;
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
