import { defineConfig } from "@playwright/test";

const e2ePort = 8799;

export default defineConfig({
  testDir: "./e2e",
  timeout: 180_000,
  fullyParallel: false,
  webServer: {
    command: `PORT=${e2ePort} npx pnpm@10 --filter @paper-tanks/server dev`,
    url: `http://127.0.0.1:${e2ePort}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: {
    baseURL: `http://127.0.0.1:${e2ePort}`,
    channel: "chrome",
  },
});
