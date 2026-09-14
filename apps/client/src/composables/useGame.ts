import { PING_MS, type ClientMessage, type PlayerView, type SeatId, type ServerMessage } from "@paper-tanks/shared";
import { onMounted, onUnmounted, ref } from "vue";

const TOKEN_KEY = "paper-tanks-token";

export interface HostInfo {
  joinUrls: string[];
  preferredUrl: string;
  qrSvg: string;
}

export function useGame() {
  const view = ref<PlayerView | null>(null);
  const seat = ref<SeatId | null>(null);
  const error = ref("");
  const connected = ref(false);
  const host = ref<HostInfo | null>(null);
  const firing = ref(false);
  const nick = ref("");

  let ws: WebSocket | null = null;
  let ping: ReturnType<typeof setInterval> | undefined;
  let closedOnPurpose = false;

  function send(msg: ClientMessage): void {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }

  function connect(): void {
    if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
      return;
    }
    const proto = location.protocol === "https:" ? "wss" : "ws";
    ws = new WebSocket(`${proto}://${location.host}/ws`);
    ws.addEventListener("open", () => {
      connected.value = true;
      send({ type: "join", payload: { nick: nick.value || undefined, token: clientToken() } });
      ping = setInterval(() => send({ type: "ping" }), PING_MS);
    });
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(String(ev.data)) as ServerMessage;
      if (msg.type === "joined") {
        sessionStorage.setItem(TOKEN_KEY, msg.payload.token);
        seat.value = msg.payload.seat;
      } else if (msg.type === "view") {
        view.value = msg.payload;
        firing.value = false;
        error.value = "";
      } else if (msg.type === "error") {
        error.value = msg.payload.message;
        firing.value = false;
      }
    });
    ws.addEventListener("close", () => {
      connected.value = false;
      if (ping) clearInterval(ping);
      if (!closedOnPurpose) setTimeout(connect, 1200);
    });
  }

  onMounted(() => {
    void fetch("/api/host")
      .then((r) => r.json())
      .then((h: HostInfo) => {
        host.value = h;
      });
    connect();
  });
  onUnmounted(() => {
    closedOnPurpose = true;
    if (ping) clearInterval(ping);
    ws?.close();
  });

  return { view, seat, error, connected, host, nick, firing, send };
}

function clientToken(): string {
  const existing = sessionStorage.getItem(TOKEN_KEY);
  if (existing && /^[a-f0-9]{32}$/i.test(existing)) return existing;
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const token = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  sessionStorage.setItem(TOKEN_KEY, token);
  return token;
}
