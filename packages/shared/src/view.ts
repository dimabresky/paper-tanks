import { otherSeat } from "./constants.ts";
import { tanksLeft } from "./fleet.ts";
import { shotsOn } from "./match.ts";
import type { MatchState, PlayerView, SeatId, Shot } from "./types.ts";

function publicShot(shot: Shot): Shot {
  const { sunkUnitId: _id, ...rest } = shot;
  return rest;
}

export function getPlayerView(state: MatchState, seat: SeatId): PlayerView {
  const you = state.seats[seat];
  if (!you) {
    throw new Error("seat empty");
  }
  const opp = state.seats[otherSeat(seat)];
  const shotsYouFired = state.shots.filter((s) => s.by === seat).map(publicShot);
  const shotsOnYou = state.shots.filter((s) => s.by !== seat).map(publicShot);
  const fired = shotsYouFired.filter((s) => s.cause === "fire").length;
  const hits = shotsYouFired.filter((s) => s.result === "hit" || s.result === "sunk").length;
  const yourHitsReceived = shotsOn(state, seat);
  const oppHitsReceived = opp ? shotsOn(state, opp.id) : [];
  const showDecorations = state.phase === "battle" || state.phase === "ended";
  const lastFire = [...shotsYouFired].reverse().find((s) => s.cause === "fire");
  const lastShot = lastFire ?? (state.shots.length ? publicShot(state.shots[state.shots.length - 1]!) : null);

  return {
    you: seat,
    nick: you.nick,
    opponentNick: opp?.nick ?? null,
    phase: state.phase,
    yourFleet: you.fleet,
    yourDecorations: showDecorations ? you.decorations.map((d) => ({ ...d, cell: { ...d.cell } })) : [],
    yourReady: you.ready,
    opponentReady: opp?.ready ?? false,
    yourTanksLeft: tanksLeft(you.fleet, yourHitsReceived),
    opponentTanksLeft: tanksLeft(opp?.fleet ?? null, oppHitsReceived),
    turn: state.turn,
    shotsYouFired,
    shotsOnYou,
    lastShot,
    stats: {
      fired,
      hits,
      accuracy: fired === 0 ? 0 : Math.round((hits / fired) * 100),
    },
    winner: state.winner,
    endedReason: state.endedReason,
    matchMs:
      state.startedAt !== undefined
        ? (state.endedAt ?? Date.now()) - state.startedAt
        : undefined,
    seatsTaken: Number(Boolean(state.seats.a)) + Number(Boolean(state.seats.b)),
  };
}

/** Used in leak tests: opponent unit cell coordinates that must not appear except via shots. */
export function opponentFleetCellKeys(state: MatchState, seat: SeatId): string[] {
  const opp = state.seats[otherSeat(seat)];
  if (!opp?.fleet) return [];
  return opp.fleet.units.flatMap((u) => u.cells.map((c) => `${c.x}:${c.y}:unit`));
}
