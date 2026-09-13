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
    if ((await cell.locator(".dot, .cross").count()) > 0) continue;
    await cell.click({ force: true });
    return;
  }
}

test("two players finish a match; /api/host does not leak fleets", async ({ browser }) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  await Promise.all([pageA.goto("/"), pageB.goto("/")]);
  await expect(pageA.getByTestId("host-panel")).toBeVisible();

  await Promise.all([placeReady(pageA), placeReady(pageB)]);
  await expect(pageA.getByTestId("stats")).toBeVisible({ timeout: 20_000 });
  await expect(pageB.getByTestId("stats")).toBeVisible({ timeout: 20_000 });

  const hostBody = await pageA.evaluate(async () => (await fetch("/api/host")).text());
  expect(hostBody).not.toContain("secret-");
  expect(hostBody).not.toContain("yourFleet");

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

  await expect(pageA.getByTestId("result").or(pageB.getByTestId("result"))).toBeVisible();

  await ctxA.close();
  await ctxB.close();
});
