import { randomBytes } from "node:crypto";
import {
  applyFire,
  createMatch,
  DISCONNECT_MS,
  freeSeat,
  getPlayerView,
  occupySeat,
  otherSeat,
  placeFleet,
  randomValidFleet,
  setReady,
  type ClientMessage,
  type ErrorCode,
  type MatchState,
  type SeatId,
  type ServerMessage,
  voteRematch,
  winByDisconnect,
  GameError,
} from "@paper-tanks/shared";
import { hostInfo } from "./lan.ts";

export interface WireClient {
  send(msg: ServerMessage): void;
}

export class Room {
  readonly state: MatchState = createMatch();
  private readonly clients = new Map<SeatId, WireClient>();
  private readonly disconnectTimers = new Map<SeatId, ReturnType<typeof setTimeout>>();
  private readonly tokenToSeat = new Map<string, SeatId>();

  handle(client: WireClient, raw: unknown): void {
    const msg = parseMessage(raw);
    if (!msg) {
      client.send(error("BAD_MESSAGE", "Не вышло, попробуй ещё раз"));
      return;
    }
    try {
      this.dispatch(client, msg);
    } catch (err) {
      if (err instanceof GameError) {
        client.send(error(err.code, err.message));
        return;
      }
      console.error(err);
      client.send(error("BAD_MESSAGE", "Не вышло, попробуй ещё раз"));
    }
  }

  drop(client: WireClient): void {
    const seat = this.seatOf(client);
    if (!seat) return;
    this.clients.delete(seat);
    const player = this.state.seats[seat];
    if (player) player.connected = false;
    this.clearTimer(seat);
    const timer = setTimeout(() => this.expire(seat), DISCONNECT_MS);
    this.disconnectTimers.set(seat, timer);
  }

  views(): { seat: SeatId; view: ReturnType<typeof getPlayerView> }[] {
    const out = [];
    for (const seat of ["a", "b"] as const) {
      if (this.state.seats[seat]) out.push({ seat, view: getPlayerView(this.state, seat) });
    }
    return out;
  }

  private dispatch(client: WireClient, msg: ClientMessage): void {
    switch (msg.type) {
      case "ping":
        client.send({ type: "pong" });
        return;
      case "join":
        this.join(client, msg.payload.nick, msg.payload.token);
        return;
      case "place": {
        const seat = this.requireLive(client);
        placeFleet(this.state, seat, { units: msg.payload.units });
        this.broadcast();
        return;
      }
      case "ready": {
        const seat = this.requireLive(client);
        setReady(this.state, seat);
        this.broadcast();
        return;
      }
      case "fire": {
        const seat = this.requireLive(client);
        applyFire(this.state, seat, { x: msg.payload.x, y: msg.payload.y });
        this.broadcast();
        return;
      }
      case "rematch": {
        const seat = this.requireLive(client);
        voteRematch(this.state, seat);
        this.broadcast();
        return;
      }
      default:
        client.send(error("BAD_MESSAGE", "Не вышло, попробуй ещё раз"));
    }
  }

  private join(client: WireClient, nick: string | undefined, token: string | undefined): void {
    if (token && this.tokenToSeat.has(token)) {
      const seat = this.tokenToSeat.get(token)!;
      const player = this.state.seats[seat];
      if (!player || player.token !== token) {
        client.send(error("BAD_MESSAGE", "Не вышло, попробуй ещё раз"));
        return;
      }
      this.attach(seat, client);
      player.connected = true;
      player.lastSeen = Date.now();
      this.clearTimer(seat);
      client.send({
        type: "joined",
        payload: { token, seat, joinUrls: hostInfo().joinUrls },
      });
      this.broadcast();
      return;
    }

    const free = (["a", "b"] as const).find((s) => this.state.seats[s] === null);
    if (!free) {
      client.send({
        type: "error",
        payload: { code: "ROOM_FULL", message: "Мест нет — уже двое за столом" },
      });
      return;
    }
    const newToken = randomBytes(16).toString("hex");
    occupySeat(this.state, free, nick ?? "", newToken);
    this.tokenToSeat.set(newToken, free);
    this.attach(free, client);
    client.send({
      type: "joined",
      payload: { token: newToken, seat: free, joinUrls: hostInfo().joinUrls },
    });
    this.broadcast();
  }

  private attach(seat: SeatId, client: WireClient): void {
    const prev = this.clients.get(seat);
    if (prev && prev !== client) {
      prev.send(error("BAD_MESSAGE", "Переподключение с другого устройства"));
    }
    this.clients.set(seat, client);
  }

  private expire(seat: SeatId): void {
    this.disconnectTimers.delete(seat);
    const player = this.state.seats[seat];
    if (!player || player.connected) return;
    if (this.state.phase === "battle") {
      winByDisconnect(this.state, otherSeat(seat));
      this.broadcast();
      return;
    }
    this.tokenToSeat.delete(player.token);
    freeSeat(this.state, seat);
    this.clients.delete(seat);
    this.broadcast();
  }

  private requireLive(client: WireClient): SeatId {
    const seat = this.seatOf(client);
    if (!seat) throw new GameError("UNKNOWN_SEAT", "Сначала зайди в комнату");
    return seat;
  }

  private seatOf(client: WireClient): SeatId | undefined {
    for (const [seat, c] of this.clients) {
      if (c === client) return seat;
    }
    return undefined;
  }

  private clearTimer(seat: SeatId): void {
    const t = this.disconnectTimers.get(seat);
    if (t) clearTimeout(t);
    this.disconnectTimers.delete(seat);
  }

  private broadcast(): void {
    for (const [seat, client] of this.clients) {
      if (!this.state.seats[seat]) continue;
      client.send({ type: "view", payload: getPlayerView(this.state, seat) });
    }
  }
}

function error(code: ErrorCode, message: string): ServerMessage {
  return { type: "error", payload: { code, message } };
}

function parseMessage(raw: unknown): ClientMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const msg = raw as { type?: string; payload?: unknown };
  if (typeof msg.type !== "string") return null;
  return msg as ClientMessage;
}

export function debugRandomPlace(): ReturnType<typeof randomValidFleet> {
  return randomValidFleet();
}
