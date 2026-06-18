import { test, expect } from "@playwright/test";
import { gotoSettings, onboardContext } from "./helpers";

test.describe("settings cloud sync", () => {
  test("shows cloud sync controls", async ({ page, context }) => {
    await onboardContext(context);
    await gotoSettings(page);
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cloud sync (optional)" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create sync session" })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Push to cloud" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Pull from cloud" })).toBeVisible();
  });

  test("creates sync session via API proxy", async ({ request }) => {
    const backendUrl = process.env.E2E_BACKEND_URL ?? "http://127.0.0.1:4100";
    const res = await request.post(`${backendUrl}/api/cloud/auth/session`, {
      data: { label: "Playwright E2E" },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(typeof body.token).toBe("string");
    expect(body.session.label).toBe("Playwright E2E");
  });
});