export type SeatId = "a" | "b";
export type Phase = "lobby" | "placement" | "battle" | "ended";
export type ShotResult = "miss" | "hit" | "sunk";

export interface Cell {
  x: number;
  y: number;
}

export interface Unit {
  id: string;
  length: 1 | 2 | 3 | 4;
  cells: Cell[];
}

export interface Fleet {
  units: Unit[];
}

export interface Shot {
  by: SeatId;
  cell: Cell;
  result: ShotResult;
  sunkUnitId?: string;
  at: number;
}

export interface Seat {
  id: SeatId;
  nick: string;
  token: string;
  ready: boolean;
  fleet: Fleet | null;
  connected: boolean;
  lastSeen: number;
}

export interface MatchState {
  phase: Phase;
  seats: Record<SeatId, Seat | null>;
  shots: Shot[];
  turn: SeatId | null;
  winner: SeatId | "disconnect" | null;
  startedAt?: number;
  endedAt?: number;
  rematchVotes: SeatId[];
  endedReason?: "fleet" | "disconnect";
}

export interface PlayerView {
  you: SeatId;
  nick: string;
  opponentNick: string | null;
  phase: Phase;
  yourFleet: Fleet | null;
  yourReady: boolean;
  opponentReady: boolean;
  opponentTanksLeft: number;
  yourTanksLeft: number;
  turn: SeatId | null;
  shotsYouFired: Shot[];
  shotsOnYou: Shot[];
  lastShot: Shot | null;
  stats: { fired: number; hits: number; accuracy: number };
  winner: MatchState["winner"];
  endedReason?: "fleet" | "disconnect";
  matchMs?: number;
  seatsTaken: number;
}

export type ErrorCode =
  | "ROOM_FULL"
  | "NOT_YOUR_TURN"
  | "CELL_TAKEN"
  | "BAD_FLEET"
  | "BAD_PHASE"
  | "BAD_MESSAGE"
  | "UNKNOWN_SEAT";

export type ClientMessage =
  | { type: "join"; payload: { nick?: string; token?: string } }
  | { type: "place"; payload: { units: Unit[] } }
  | { type: "ready"; payload?: Record<string, never> }
  | { type: "fire"; payload: { x: number; y: number } }
  | { type: "rematch"; payload?: Record<string, never> }
  | { type: "ping"; payload?: Record<string, never> };

export type ServerMessage =
  | { type: "joined"; payload: { token: string; seat: SeatId; joinUrls: string[] } }
  | { type: "view"; payload: PlayerView }
  | { type: "error"; payload: { code: ErrorCode; message: string } }
  | { type: "pong"; payload?: Record<string, never> };

export class GameError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "GameError";
  }
}
