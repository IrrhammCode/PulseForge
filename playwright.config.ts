import { defineConfig, devices } from "@playwright/test";

const BACKEND_URL = process.env.E2E_BACKEND_URL ?? "http://127.0.0.1:4100";
const FRONTEND_URL = process.env.E2E_FRONTEND_URL ?? "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: FRONTEND_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "PORT=4100 npm run dev -w @pulseforge/backend",
      url: `${BACKEND_URL}/health`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `PORT=3100 BACKEND_URL=${BACKEND_URL} npm run dev -w @pulseforge/frontend`,
      url: FRONTEND_URL,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});