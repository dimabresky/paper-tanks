import { networkInterfaces } from "node:os";
import { PORT } from "@paper-tanks/shared";

const LINK_LOCAL = /^169\.254\./;

export interface HostInfo {
  joinUrls: string[];
  preferredUrl: string;
}

export function lanIPv4s(): string[] {
  const found: { address: string; name: string }[] = [];
  for (const [name, addrs] of Object.entries(networkInterfaces())) {
    for (const addr of addrs ?? []) {
      const family = addr.family === "IPv4" || addr.family === 4;
      if (!family || addr.internal) continue;
      if (LINK_LOCAL.test(addr.address)) continue;
      found.push({ address: addr.address, name });
    }
  }
  found.sort((a, b) => score(b.name) - score(a.name));
  return [...new Set(found.map((f) => f.address))];
}

function score(name: string): number {
  const n = name.toLowerCase();
  if (n.startsWith("en0") || n.includes("wlan") || n.includes("wifi")) return 3;
  if (n.startsWith("en")) return 2;
  if (n.includes("docker") || n.includes("bridge") || n.includes("utun") || n.includes("vmnet"))
    return 0;
  return 1;
}

export function hostInfo(port = PORT): HostInfo {
  const ips = lanIPv4s();
  const joinUrls = ips.map((ip) => `http://${ip}:${port}/`);
  if (joinUrls.length === 0) {
    joinUrls.push(`http://127.0.0.1:${port}/`);
  }
  return { joinUrls, preferredUrl: joinUrls[0]! };
}
