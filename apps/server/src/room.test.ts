import { describe, expect, it, vi } from "vitest";
import { COLS, ROWS, getPlayerView, randomValidFleet } from "@paper-tanks/shared";
import { lanIPv4s } from "./lan.ts";
import { Room, type WireClient } from "./room.ts";

class MockClient implements WireClient {
  messages: unknown[] = [];
  send(msg: unknown): void {
    this.messages.push(msg);
  }
  last(): unknown {
    return this.messages[this.messages.length - 1];
  }
}

describe("Room", () => {
  it("seats two players and rejects a third", () => {
    const room = new Room();
    const a = new MockClient();
    const b = new MockClient();
    const c = new MockClient();
    room.handle(a, { type: "join", payload: { nick: "Аня" } });
    room.handle(b, { type: "join", payload: { nick: "Боря" } });
    room.handle(c, { type: "join", payload: {} });
    expect((c.last() as { payload: { code: string } }).payload.code).toBe("ROOM_FULL");
    const joinedA = a.messages.find((m) => (m as { type: string }).type === "joined") as {
      payload: { seat: string; token: string };
    };
    expect(joinedA.payload.seat).toBe("a");
  });

  it("reconnects with the same token without a third seat", () => {
    const room = new Room();
    const a = new MockClient();
    const a2 = new MockClient();
    const b = new MockClient();
    room.handle(a, { type: "join", payload: {} });
    const token = (a.messages.find((m) => (m as { type: string }).type === "joined") as {
      payload: { token: string };
    }).payload.token;
    room.handle(b, { type: "join", payload: {} });
    room.handle(a2, { type: "join", payload: { token } });
    const joined = a2.messages.find((m) => (m as { type: string }).type === "joined") as {
      payload: { seat: string };
    };
    expect(joined.payload.seat).toBe("a");
    expect(room.state.seats.a?.token).toBe(token);
    expect(room.state.seats.b).not.toBeNull();
  });

  it("keeps one seat when the same client token reconnects before joined is handled", () => {
    const room = new Room();
    const first = new MockClient();
    const retry = new MockClient();
    const token = "ab".repeat(16);
    room.handle(first, { type: "join", payload: { token } });
    room.handle(retry, { type: "join", payload: { token } });
    expect(room.state.seats.a?.token).toBe(token);
    expect(room.state.seats.b).toBeNull();
  });

  it("sends different views that do not leak opponent fleet", () => {
    const room = new Room();
    const a = new MockClient();
    const b = new MockClient();
    room.handle(a, { type: "join", payload: {} });
    room.handle(b, { type: "join", payload: {} });
    const fa = randomValidFleet();
    const fb = randomValidFleet();
    room.handle(a, { type: "place", payload: { units: fa.units } });
    room.handle(b, { type: "place", payload: { units: fb.units } });
    room.handle(a, { type: "ready", payload: {} });
    room.handle(b, { type: "ready", payload: {} });
    const viewA = [...a.messages].reverse().find((m) => (m as { type: string }).type === "view") as {
      payload: { yourFleet: { units: { id: string }[] }; opponentTanksLeft: number };
    };
    const viewB = [...b.messages].reverse().find((m) => (m as { type: string }).type === "view") as {
      payload: { yourFleet: { units: { id: string }[] } };
    };
    const idsA = new Set(viewA.payload.yourFleet.units.map((u) => u.id));
    const idsB = new Set(viewB.payload.yourFleet.units.map((u) => u.id));
    for (const id of idsA) expect(JSON.stringify(viewB.payload)).not.toContain(`"${id}"`);
    for (const id of idsB) expect(JSON.stringify(viewA.payload)).not.toContain(`"${id}"`);
    expect(viewA.payload.opponentTanksLeft).toBe(8);
  });

  it("lets the first two browsers occupy seats and rejects a third with ROOM_FULL", () => {
    const room = new Room();
    const first = new MockClient();
    const second = new MockClient();
    const third = new MockClient();
    room.handle(first, { type: "join", payload: { nick: "Раз" } });
    expect(room.state.seats.a).not.toBeNull();
    expect(room.state.seats.b).toBeNull();
    room.handle(second, { type: "join", payload: { nick: "Два" } });
    expect(room.state.seats.b).not.toBeNull();
    room.handle(third, { type: "join", payload: {} });
    expect((third.last() as { payload: { code: string } }).payload.code).toBe("ROOM_FULL");
  });

  it("awards the remaining player after 60s disconnect in battle", () => {
    vi.useFakeTimers();
    try {
      const room = new Room();
      const a = new MockClient();
      const b = new MockClient();
      room.handle(a, { type: "join", payload: {} });
      room.handle(b, { type: "join", payload: {} });
      room.handle(a, { type: "place", payload: { units: randomValidFleet().units } });
      room.handle(b, { type: "place", payload: { units: randomValidFleet().units } });
      room.handle(a, { type: "ready", payload: {} });
      room.handle(b, { type: "ready", payload: {} });
      expect(room.state.phase).toBe("battle");
      room.drop(a);
      vi.advanceTimersByTime(59_000);
      expect(room.state.phase).toBe("battle");
      vi.advanceTimersByTime(1_000);
      expect(room.state.phase).toBe("ended");
      expect(room.state.winner).toBe("b");
      expect(room.state.endedReason).toBe("disconnect");
      const remaining = getPlayerView(room.state, "b");
      expect(remaining.endedReason).toBe("disconnect");
      expect(remaining.winner).toBe(remaining.you);
      const dropped = getPlayerView(room.state, "a");
      expect(dropped.endedReason).toBe("disconnect");
      expect(dropped.winner).not.toBe(dropped.you);
    } finally {
      vi.useRealTimers();
    }
  });

  it("plays a full match to the end", () => {
    const room = new Room();
    const a = new MockClient();
    const b = new MockClient();
    room.handle(a, { type: "join", payload: {} });
    room.handle(b, { type: "join", payload: {} });
    room.handle(a, { type: "place", payload: { units: randomValidFleet().units } });
    room.handle(b, { type: "place", payload: { units: randomValidFleet().units } });
    room.handle(a, { type: "ready", payload: {} });
    room.handle(b, { type: "ready", payload: {} });
    const all = Array.from({ length: COLS * ROWS }, (_, i) => ({
      x: i % COLS,
      y: Math.floor(i / COLS),
    }));
    const fired = { a: new Set<string>(), b: new Set<string>() };
    for (let n = 0; n < COLS * ROWS * 2 + 200; n++) {
      if (room.state.phase === "ended") break;
      const turn = room.state.turn;
      if (!turn) break;
      const cell = all.find((c) => !fired[turn].has(`${c.x},${c.y}`));
      if (!cell) break;
      fired[turn].add(`${cell.x},${cell.y}`);
      room.handle(turn === "a" ? a : b, { type: "fire", payload: cell });
    }
    expect(room.state.phase).toBe("ended");
    expect(room.state.winner === "a" || room.state.winner === "b").toBe(true);
  });
});

describe("lanIPv4s", () => {
  it("never returns link-local addresses", () => {
    expect(lanIPv4s().every((ip) => !ip.startsWith("169.254."))).toBe(true);
  });
});
