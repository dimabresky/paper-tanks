export type {
  Cell,
  ClientMessage,
  Decoration,
  DecorationKind,
  ErrorCode,
  Fleet,
  MatchState,
  PlayerView,
  Seat,
  SeatId,
  ServerMessage,
  Shot,
  ShotCause,
  ShotResult,
  Unit,
} from "./types.ts";
export { GameError } from "./types.ts";
export {
  COLS,
  COL_LETTERS,
  DISCONNECT_MS,
  FLEET_LENGTHS,
  NICK_MAX,
  PING_MS,
  PORT,
  ROWS,
  cellKey,
  cellLabel,
  colLetter,
  otherSeat,
  sanitizeNick,
} from "./constants.ts";
export {
  canAddUnit,
  cellsForAnchor,
  inBounds,
  isOrthogonalContiguous,
  isUnitSunk,
  randomValidFleet,
  tanksLeft,
  unitAt,
  unitsTouchOrOverlap,
  validateFleet,
} from "./fleet.ts";
export { mooreNeighbors, placeDecorations } from "./decorations.ts";
export {
  applyFire,
  createMatch,
  freeSeat,
  occupySeat,
  placeFleet,
  requireSeat,
  setReady,
  shotsOn,
  voteRematch,
  winByDisconnect,
} from "./match.ts";
export { getPlayerView, opponentFleetCellKeys } from "./view.ts";
