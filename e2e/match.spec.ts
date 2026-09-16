import { expect, test, type Page } from "@playwright/test";

async function placeReady(page: Page): Promise<void> {
  await expect(page.getByTestId("random-fleet")).toBeVisible({ timeout: 20_000 });
  await page.getByTestId("random-fleet").click();
  await page.getByTestId("ready").click();
}

async function fireSomething(page: Page, seen: Set<string>): Promise<void> {
  const stats = page.getByTestId("stats");
  if (!(await stats.isVisible().catch(() => false))) return;
  const before = (await stats.textContent()) ?? "";
  if (!before.includes("твой ход")) return;
  const coord = await page.evaluate((already: string[]) => {
    const skip = new Set(already);
    const cells = [...document.querySelectorAll('[data-testid="cell"]')] as HTMLButtonElement[];
    const el = cells.find((c) => {
      const k = `${c.dataset.x},${c.dataset.y}`;
      if (skip.has(k) || c.childElementCount > 0) return false;
      return true;
    });
    if (!el) return null;
    el.click();
    return `${el.dataset.x},${el.dataset.y}`;
  }, [...seen]);
  if (!coord) return;
  seen.add(coord);
  await page
    .waitForFunction((prev) => document.querySelector('[data-testid="stats"]')?.textContent !== prev, before, {
      timeout: 2_000,
    })
    .catch(() => undefined);
}

async function assertZoomHitsSameCell(page: Page): Promise<void> {
  const cell = page.locator('[data-testid="cell"][data-x="4"][data-y="5"]');
  await expect(cell).toBeVisible();
  await page.getByTestId("zoom-in").click();
  await page.getByTestId("zoom-in").click();
  await cell.scrollIntoViewIfNeeded();
  const box = await cell.boundingBox();
  expect(box).toBeTruthy();
  const hit = await page.evaluate(
    ({ x, y }) => {
      const el = document.elementFromPoint(x, y);
      const button = el?.closest("[data-testid='cell']");
      return {
        x: button?.getAttribute("data-x"),
        y: button?.getAttribute("data-y"),
      };
    },
    { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 },
  );
  expect(hit).toEqual({ x: "4", y: "5" });
}

test("two players finish a match; host JSON and zoom stay honest", async ({ browser }) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  await pageA.goto("/");
  await expect(pageA.getByTestId("status")).toBeVisible();
  await pageB.goto("/");

  await expect(pageA.getByTestId("random-fleet")).toBeVisible({ timeout: 20_000 });
  await expect(pageB.getByTestId("random-fleet")).toBeVisible({ timeout: 20_000 });
  await expect(pageA.getByTestId("host-panel")).toHaveCount(0);
  await expect(pageA.getByTestId("cell")).toHaveCount(16 * 22);
  await expect(pageA.getByTestId("placement-tray")).toBeVisible();

  const token = pageA.getByTestId("tank-token").first();
  const drop = pageA.locator('[data-testid="cell"][data-x="2"][data-y="2"]');
  await token.dragTo(drop);
  await expect(pageA.getByTestId("placed-tank")).toHaveCount(1);
  await pageA.getByTestId("placed-tank").click();
  await pageA.getByTestId("rotate").click();

  await assertZoomHitsSameCell(pageA);

  await Promise.all([placeReady(pageA), placeReady(pageB)]);
  await expect(pageA.getByTestId("stats")).toBeVisible({ timeout: 20_000 });
  await expect(pageB.getByTestId("stats")).toBeVisible({ timeout: 20_000 });

  const hostBody = await pageA.evaluate(async () => (await fetch("/api/host")).text());
  expect(hostBody).not.toContain("secret-");
  expect(hostBody).not.toContain("yourFleet");
  expect(hostBody).not.toContain("yourDecorations");
  expect(hostBody).not.toContain('"kind":"tree"');
  expect(hostBody).not.toContain('"kind":"crate"');

  const seenA = new Set<string>();
  const seenB = new Set<string>();
  for (let i = 0; i < 900; i++) {
    if (
      (await pageA.getByTestId("result").isVisible().catch(() => false)) ||
      (await pageB.getByTestId("result").isVisible().catch(() => false))
    ) {
      break;
    }
    await fireSomething(pageA, seenA);
    await fireSomething(pageB, seenB);
  }

  await expect
    .poll(
      async () => {
        const a = await pageA.getByTestId("result").isVisible().catch(() => false);
        const b = await pageB.getByTestId("result").isVisible().catch(() => false);
        return a || b;
      },
      { timeout: 15_000 },
    )
    .toBe(true);

  await ctxA.close();
  await ctxB.close();
});
