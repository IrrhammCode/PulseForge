import { test, expect } from "@playwright/test";
import { onboardContext } from "./helpers";
import { buildViralTimelineProject, E2E_VIRAL_PROJECT_ID } from "./fixtures";

test.describe("viral lab timeline", () => {
  test("undo restores timeline after split", async ({ page, context }) => {
    await onboardContext(context);

    const project = buildViralTimelineProject();
    await page.addInitScript((seed) => {
      localStorage.setItem("pulseforge_studio_projects", JSON.stringify([seed]));
    }, project);

    await page.goto(`/viral?project=${E2E_VIRAL_PROJECT_ID}`);
    await expect(page.getByText("Music Timeline Editor")).toBeVisible({ timeout: 15_000 });

    const undo = page.getByTestId("timeline-undo");
    const split = page.getByTestId("timeline-split");

    await expect(undo).toBeDisabled();
    await split.click();

    await expect(undo).toBeEnabled({ timeout: 5000 });
    await undo.click();
    await expect(undo).toBeDisabled({ timeout: 5000 });

    const sectionCount = await page.evaluate((projectId) => {
      const raw = localStorage.getItem("pulseforge_studio_projects");
      if (!raw) return 0;
      const projects = JSON.parse(raw) as Array<{
        id: string;
        versions: Array<{ timelineEdits?: { sections: unknown[] } }>;
      }>;
      const p = projects.find((row) => row.id === projectId);
      return p?.versions[0]?.timelineEdits?.sections.length ?? 0;
    }, E2E_VIRAL_PROJECT_ID);

    expect(sectionCount).toBe(0);
  });
});