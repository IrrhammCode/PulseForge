import type { BrowserContext, Page } from "@playwright/test";

export const E2E_SYNC_TOKEN = process.env.E2E_SYNC_TOKEN ?? "your_sync_secret_here";

export async function onboardContext(context: BrowserContext) {
  await context.addCookies([
    {
      name: "pf_onboarded",
      value: "1",
      domain: "127.0.0.1",
      path: "/",
    },
  ]);
}

export async function gotoSettings(page: Page) {
  await page.goto("/settings");
  await page.getByRole("heading", { name: "Settings" }).waitFor();
}