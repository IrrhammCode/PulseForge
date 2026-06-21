import { test, expect } from "@playwright/test";
import { gotoSettings, onboardContext } from "./helpers";

const BOOTSTRAP_TOKEN = process.env.E2E_SYNC_TOKEN ?? "your_sync_secret_here";
const LOCAL_UPDATED = "2026-06-16T10:00:00.000Z";
const CLOUD_UPDATED = "2026-06-16T12:00:00.000Z";

function mockProject(id: string, title: string, updatedAt: string) {
  return {
    id,
    title,
    artistName: "E2E Artist",
    genre: "Pop",
    mood: "Energetic",
    status: "draft",
    versions: [
      {
        id: "v1",
        label: "v1",
        lyrics: {
          verse1: "",
          verse2: "",
          chorus: "",
          bridge: "",
          raw: "",
        },
        createdAt: updatedAt,
        updatedAt,
      },
    ],
    activeVersionId: "v1",
    createdAt: updatedAt,
    updatedAt,
  };
}

test.describe("cloud pull conflict flow", () => {
  test("preview conflicts and confirm pull with resolution", async ({
    page,
    context,
    request,
  }) => {
    const backendUrl = process.env.E2E_BACKEND_URL ?? "http://127.0.0.1:4100";
    const projectId = `e2e-conflict-${Date.now()}`;

    const cloudProject = mockProject(projectId, "Cloud copy", CLOUD_UPDATED);
    const pushRes = await request.post(`${backendUrl}/api/cloud/projects`, {
      headers: { Authorization: `Bearer ${BOOTSTRAP_TOKEN}` },
      data: { mode: "upsert", project: cloudProject },
    });
    expect(pushRes.ok()).toBeTruthy();

    const listRes = await request.get(`${backendUrl}/api/cloud/projects`, {
      headers: { Authorization: `Bearer ${BOOTSTRAP_TOKEN}` },
    });
    expect(listRes.ok()).toBeTruthy();
    const listed = (await listRes.json()) as { projects: Array<{ id: string }> };
    expect(listed.projects.some((p) => p.id === projectId)).toBe(true);

    await onboardContext(context);

    const localProject = mockProject(projectId, "Local copy", LOCAL_UPDATED);
    await page.addInitScript(
      ({ projects, syncToken }) => {
        localStorage.setItem("pulseforge_studio_projects", JSON.stringify(projects));
        localStorage.setItem("pulseforge_sync_token", syncToken);
      },
      { projects: [localProject], syncToken: BOOTSTRAP_TOKEN }
    );

    await gotoSettings(page);

    await page.getByRole("button", { name: "Pull from cloud" }).click();
    await expect(page.getByTestId("cloud-conflict-panel")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Local copy")).toBeVisible();
    await expect(page.getByText(/conflict\(s\) found/i)).toBeVisible();

    await page.getByRole("button", { name: "Keep all local" }).click();
    await page.getByRole("button", { name: "Confirm pull" }).click();

    await expect(page.getByText(/Pulled .* from cloud/i)).toBeVisible({ timeout: 15_000 });

    const title = await page.evaluate((id) => {
      const raw = localStorage.getItem("pulseforge_studio_projects");
      if (!raw) return null;
      const projects = JSON.parse(raw) as Array<{ id: string; title: string }>;
      return projects.find((p) => p.id === id)?.title ?? null;
    }, projectId);
    expect(title).toBe("Local copy");
  });
});