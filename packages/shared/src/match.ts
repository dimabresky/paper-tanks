import { otherSeat, sanitizeNick } from "./constants.ts";
import { isUnitSunk, tanksLeft, unitAt, validateFleet } from "./fleet.ts";
import { GameError, type Cell, type Fleet, type MatchState, type Seat, type SeatId, type Shot } from "./types.ts";

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

export function setReady(state: MatchState, seat: SeatId, now = Date.now()): void {
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
    state.phase = "battle";
    state.turn = Math.random() < 0.5 ? "a" : "b";
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
  if (cell.x < 0 || cell.x > 11 || cell.y < 0 || cell.y > 15) {
    throw new GameError("BAD_MESSAGE", "Клетка вне листа");
  }
  const already = state.shots.some(
    (s) => s.by === seat && s.cell.x === cell.x && s.cell.y === cell.y,
  );
  if (already) throw new GameError("CELL_TAKEN", "Уже стреляли сюда");

  const hitsSoFar = shotsOn(state, defender.id);
  const unit = unitAt(defender.fleet, cell);
  let shot: Shot;
  if (!unit) {
    shot = { by: seat, cell, result: "miss", at: now };
    state.shots.push(shot);
    state.turn = defender.id;
  } else {
    const hitsAfter = [...hitsSoFar, cell];
    const sunk = isUnitSunk(unit, hitsAfter);
    shot = {
      by: seat,
      cell,
      result: sunk ? "sunk" : "hit",
      sunkUnitId: sunk ? unit.id : undefined,
      at: now,
    };
    state.shots.push(shot);
    if (tanksLeft(defender.fleet, hitsAfter) === 0) {
      state.phase = "ended";
      state.winner = attacker.id;
      state.endedReason = "fleet";
      state.endedAt = now;
      state.turn = null;
    }
  }
  return shot;
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
