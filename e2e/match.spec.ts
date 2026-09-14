import { expect, test, type Page } from "@playwright/test";

async function placeReady(page: Page): Promise<void> {
  await expect(page.getByTestId("random-fleet")).toBeVisible({ timeout: 20_000 });
  await page.getByTestId("random-fleet").click();
  await page.getByTestId("ready").click();
}

async function fireSomething(page: Page): Promise<void> {
  const cells = page.getByTestId("cell");
  const n = await cells.count();
  for (let i = 0; i < n; i++) {
    const cell = cells.nth(i);
    if ((await cell.locator(":scope > *").count()) > 0) continue;
    await cell.click({ force: true });
    return;
  }
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

  for (let i = 0; i < 500; i++) {
    if (
      (await pageA.getByTestId("result").isVisible().catch(() => false)) ||
      (await pageB.getByTestId("result").isVisible().catch(() => false))
    ) {
      break;
    }
    await fireSomething(pageA);
    await fireSomething(pageB);
  }

  await expect
    .poll(async () => {
      const a = await pageA.getByTestId("result").isVisible().catch(() => false);
      const b = await pageB.getByTestId("result").isVisible().catch(() => false);
      return a || b;
    })
    .toBe(true);

  await ctxA.close();
  await ctxB.close();
});
