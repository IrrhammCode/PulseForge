import { test, expect } from "@playwright/test";

test.describe("welcome landing", () => {
  test("shows hero and studio entry point", async ({ page }) => {
    await page.goto("/welcome");
    await expect(
      page.getByRole("heading", { name: /your music studio/i })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Open Studio" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Quick Analyze" })).toBeVisible();
  });

  test("backend health endpoint responds", async ({ request }) => {
    const backendUrl = process.env.E2E_BACKEND_URL ?? "http://127.0.0.1:4100";
    const health = await request.get(`${backendUrl}/health`);
    expect(health.ok()).toBeTruthy();
    const body = await health.json();
    expect(body).toMatchObject({ ok: true, service: "pulseforge-backend" });
  });
});