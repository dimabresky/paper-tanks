import { createServer, type IncomingMessage, type ServerResponse, type Server as HttpServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PORT } from "@paper-tanks/shared";
import QRCode from "qrcode";
import { WebSocketServer, type WebSocket } from "ws";
import { hostInfo } from "./lan.ts";
import { Room, type WireClient } from "./room.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === "production";
const room = new Room();

async function main(): Promise<void> {
  let vite: Awaited<ReturnType<typeof import("vite")["createServer"]>> | null = null;

  const server = createServer(async (req, res) => {
    try {
      await handleHttp(req, res, vite);
    } catch (err) {
      console.error(err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end("error");
      }
    }
  });

  if (!isProd) {
    vite = await (
      await import("vite")
    ).createServer({
      configFile: resolve(__dirname, "../../client/vite.config.ts"),
      root: resolve(__dirname, "../../client"),
      server: { middlewareMode: true, hmr: { server }, allowedHosts: true },
      appType: "spa",
    });
  }

  const wss = new WebSocketServer({ noServer: true });
  server.on("upgrade", (req, socket, head) => {
    const pathname = (req.url ?? "").split("?")[0];
    if (pathname !== "/ws") return;
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });
  wss.on("connection", (ws) => attachSocket(ws));

  server.listen(PORT, "0.0.0.0", () => {
    const info = hostInfo(PORT);
    console.log(`Paper Tanks http://127.0.0.1:${PORT}/`);
    console.log(`QR / телефоны: ${info.preferredUrl}`);
    for (const url of info.joinUrls) console.log(`  ${url}`);
  });

  listenForShutdown(server, wss, vite);
}

async function handleHttp(
  req: IncomingMessage,
  res: ServerResponse,
  vite: Awaited<ReturnType<typeof import("vite")["createServer"]>> | null,
): Promise<void> {
  const url = req.url ?? "/";
  if (url.startsWith("/api/health")) {
    json(res, { ok: true });
    return;
  }
  if (url.startsWith("/api/host")) {
    const info = hostInfo(PORT);
    const qrSvg = await QRCode.toString(info.preferredUrl, { type: "svg", margin: 1 });
    json(res, { ...info, qrSvg });
    return;
  }
  if (vite) {
    vite.middlewares(req, res);
    return;
  }
  const { default: fs } = await import("node:fs");
  const dist = resolve(__dirname, "../../client/dist");
  const path = url === "/" ? "/index.html" : url.split("?")[0]!;
  const file = resolve(dist, `.${path}`);
  if (!file.startsWith(dist)) {
    res.statusCode = 403;
    res.end();
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      fs.readFile(resolve(dist, "index.html"), (err2, html) => {
        if (err2) {
          res.statusCode = 404;
          res.end("not found");
          return;
        }
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(html);
      });
      return;
    }
    res.setHeader("Content-Type", contentType(file));
    res.end(data);
  });
}

function listenForShutdown(
  server: HttpServer,
  wss: WebSocketServer,
  vite: Awaited<ReturnType<typeof import("vite")["createServer"]>> | null,
): void {
  let stopping = false;
  const stop = (): void => {
    if (stopping) return;
    stopping = true;
    for (const client of wss.clients) client.terminate();
    wss.close();
    server.closeAllConnections();
    void vite?.close();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 800).unref();
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}

function attachSocket(ws: WebSocket): void {
  const client: WireClient = {
    send(msg) {
      if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
    },
  };
  ws.on("message", (data) => {
    try {
      room.handle(client, JSON.parse(String(data)));
    } catch {
      client.send({
        type: "error",
        payload: { code: "BAD_MESSAGE", message: "Не вышло, попробуй ещё раз" },
      });
    }
  });
  ws.on("close", () => room.drop(client));
}

function json(res: ServerResponse, body: unknown): void {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function contentType(file: string): string {
  if (file.endsWith(".js")) return "text/javascript";
  if (file.endsWith(".css")) return "text/css";
  if (file.endsWith(".html")) return "text/html; charset=utf-8";
  if (file.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}

void main();
