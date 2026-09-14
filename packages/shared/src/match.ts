import { otherSeat, sanitizeNick } from "./constants.ts";
import { mooreNeighbors, placeDecorations, shuffle } from "./decorations.ts";
import { inBounds, isUnitSunk, tanksLeft, unitAt, validateFleet } from "./fleet.ts";
import {
  GameError,
  type Cell,
  type Decoration,
  type Fleet,
  type MatchState,
  type Seat,
  type SeatId,
  type Shot,
  type ShotCause,
  type ShotResult,
} from "./types.ts";

export function createMatch(): MatchState {
  return {
    phase: "lobby",
    seats: { a: null, b: null },
    shots: [],
    turn: null,
    winner: null,
    rematchVotes: [],
  };
}

export function occupySeat(
  state: MatchState,
  seat: SeatId,
  nick: string,
  token: string,
  now = Date.now(),
): Seat {
  const occupied: Seat = {
    id: seat,
    nick: sanitizeNick(nick, seat === "a" ? "Игрок 1" : "Игрок 2"),
    token,
    ready: false,
    fleet: null,
    decorations: [],
    connected: true,
    lastSeen: now,
  };
  state.seats[seat] = occupied;
  if (state.seats.a && state.seats.b && state.phase === "lobby") {
    state.phase = "placement";
  }
  return occupied;
}

export function freeSeat(state: MatchState, seat: SeatId): void {
  state.seats[seat] = null;
  if (state.phase === "placement" || state.phase === "lobby") {
    state.phase = state.seats.a || state.seats.b ? "lobby" : "lobby";
    const remaining = state.seats.a ?? state.seats.b;
    if (remaining) remaining.ready = false;
  }
}

export function placeFleet(state: MatchState, seat: SeatId, fleet: Fleet): void {
  const player = requireSeat(state, seat);
  if (state.phase !== "placement") {
    throw new GameError("BAD_PHASE", "Сейчас нельзя расставлять танки");
  }
  const result = validateFleet(fleet.units);
  if (!result.ok) throw new GameError("BAD_FLEET", result.error);
  player.fleet = {
    units: fleet.units.map((u, i) => ({
      ...u,
      id: `${seat}-${i}`,
      cells: u.cells.map((c) => ({ ...c })),
    })),
  };
  player.ready = false;
}

export function setReady(
  state: MatchState,
  seat: SeatId,
  now = Date.now(),
  rng: () => number = Math.random,
): void {
  const player = requireSeat(state, seat);
  if (state.phase !== "placement") {
    throw new GameError("BAD_PHASE", "Нельзя подтвердить готовность сейчас");
  }
  if (!player.fleet) throw new GameError("BAD_FLEET", "Сначала расставь танки");
  const result = validateFleet(player.fleet.units);
  if (!result.ok) throw new GameError("BAD_FLEET", result.error);
  player.ready = true;
  const a = state.seats.a;
  const b = state.seats.b;
  if (a?.ready && b?.ready && a.fleet && b.fleet) {
    a.decorations = placeDecorations(a.fleet, rng);
    b.decorations = placeDecorations(b.fleet, rng);
    state.phase = "battle";
    state.turn = rng() < 0.5 ? "a" : "b";
    state.startedAt = now;
    state.shots = [];
    state.winner = null;
    state.endedReason = undefined;
    state.rematchVotes = [];
  }
}

export function applyFire(
  state: MatchState,
  seat: SeatId,
  cell: Cell,
  now = Date.now(),
  rng: () => number = Math.random,
): Shot {
  if (state.phase !== "battle") {
    throw new GameError("BAD_PHASE", "Сейчас не бой");
  }
  if (state.turn !== seat) {
    throw new GameError("NOT_YOUR_TURN", "Сейчас ход соперника");
  }
  const attacker = requireSeat(state, seat);
  const defender = requireSeat(state, otherSeat(seat));
  if (!defender.fleet) throw new GameError("BAD_PHASE", "Нет флота соперника");
  if (!inBounds(cell)) {
    throw new GameError("BAD_MESSAGE", "Клетка вне листа");
  }
  if (openedBy(state, seat, cell)) {
    throw new GameError("CELL_TAKEN", "Уже стреляли сюда");
  }

  const resolved: Shot[] = [];
  const primary = resolveCell(state, attacker.id, defender, cell, "fire", now);
  state.shots.push(primary);
  resolved.push(primary);

  if (primary.result === "crate") {
    const opened = (c: Cell) => openedBy(state, seat, c);
    const candidates = mooreNeighbors(cell).filter((c) => !opened(c));
    const want = Math.min(candidates.length, 2 + Math.floor(rng() * 3));
    for (const blastCell of shuffle(candidates, rng).slice(0, want)) {
      if (openedBy(state, seat, blastCell)) continue;
      const blast = resolveCell(state, attacker.id, defender, blastCell, "blast", now);
      state.shots.push(blast);
      resolved.push(blast);
    }
  }

  const hitsAfter = shotsOn(state, defender.id);
  if (tanksLeft(defender.fleet, hitsAfter) === 0) {
    state.phase = "ended";
    state.winner = attacker.id;
    state.endedReason = "fleet";
    state.endedAt = now;
    state.turn = null;
    return primary;
  }

  const keepTurn = resolved.some((s) => s.result === "hit" || s.result === "sunk");
  state.turn = keepTurn ? attacker.id : defender.id;
  return primary;
}

function resolveCell(
  state: MatchState,
  attacker: SeatId,
  defender: Seat,
  cell: Cell,
  cause: ShotCause,
  now: number,
): Shot {
  const unit = defender.fleet ? unitAt(defender.fleet, cell) : undefined;
  if (unit) {
    const hitsAfter = [...shotsOn(state, defender.id), cell];
    const sunk = isUnitSunk(unit, hitsAfter);
    return {
      by: attacker,
      cell,
      result: sunk ? "sunk" : "hit",
      cause,
      sunkUnitId: sunk ? unit.id : undefined,
      at: now,
    };
  }

  const deco = decorationAt(defender, cell);
  if (deco?.kind === "tree") {
    deco.burned = true;
    return { by: attacker, cell, result: "tree", cause, at: now };
  }
  if (deco?.kind === "crate") {
    return { by: attacker, cell, result: "crate", cause, at: now };
  }
  return { by: attacker, cell, result: "miss" satisfies ShotResult, cause, at: now };
}

function decorationAt(seat: Seat, cell: Cell): Decoration | undefined {
  return seat.decorations.find((d) => d.cell.x === cell.x && d.cell.y === cell.y);
}

function openedBy(state: MatchState, attacker: SeatId, cell: Cell): boolean {
  return state.shots.some((s) => s.by === attacker && s.cell.x === cell.x && s.cell.y === cell.y);
}

export function voteRematch(state: MatchState, seat: SeatId): void {
  if (state.phase !== "ended") {
    throw new GameError("BAD_PHASE", "Партия ещё идёт");
  }
  requireSeat(state, seat);
  if (!state.rematchVotes.includes(seat)) state.rematchVotes.push(seat);
  if (state.rematchVotes.includes("a") && state.rematchVotes.includes("b")) {
    resetForRematch(state);
  }
}

export function winByDisconnect(state: MatchState, remaining: SeatId, now = Date.now()): void {
  if (state.phase !== "battle") return;
  state.phase = "ended";
  state.winner = remaining;
  state.endedReason = "disconnect";
  state.endedAt = now;
  state.turn = null;
}

function resetForRematch(state: MatchState): void {
  state.phase = "placement";
  state.shots = [];
  state.turn = null;
  state.winner = null;
  state.startedAt = undefined;
  state.endedAt = undefined;
  state.endedReason = undefined;
  state.rematchVotes = [];
  for (const seat of ["a", "b"] as const) {
    const s = state.seats[seat];
    if (!s) continue;
    s.fleet = null;
    s.ready = false;
    s.decorations = [];
  }
}

export function shotsOn(state: MatchState, defender: SeatId): Cell[] {
  return state.shots.filter((s) => s.by === otherSeat(defender)).map((s) => s.cell);
}

export function requireSeat(state: MatchState, seat: SeatId): Seat {
  const player = state.seats[seat];
  if (!player) throw new GameError("UNKNOWN_SEAT", "Нет такого места");
  return player;
}
