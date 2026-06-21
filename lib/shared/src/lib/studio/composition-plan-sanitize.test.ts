import { describe, expect, it } from "vitest";
import { buildCompositionPlan } from "@/lib/studio/style-prompt";
import { LATE_SPRING_BALLAD_EXAMPLE } from "@/lib/studio/example-presets";
import {
  compactCompositionPlan,
  estimatePlanDurationMs,
  sanitizeCompositionPlan,
} from "@/lib/studio/composition-plan-sanitize";
import { buildExampleCreateInput } from "@/lib/studio/example-presets";

describe("composition-plan-sanitize", () => {
  it("truncates long style tokens", () => {
    const plan = sanitizeCompositionPlan({
      chunks: [
        {
          text: "[Verse]\nline",
          duration_ms: 5000,
          positive_styles: ["x".repeat(200)],
        },
      ],
    });
    expect(plan.chunks[0]!.positive_styles![0]!.length).toBeLessThanOrEqual(80);
    expect(plan.chunks[0]!.duration_ms).toBeGreaterThanOrEqual(3000);
  });

  it("compact plan caps total duration", () => {
    const seed = buildExampleCreateInput(LATE_SPRING_BALLAD_EXAMPLE);
    const plan = buildCompositionPlan(LATE_SPRING_BALLAD_EXAMPLE.lyrics, seed);
    const compact = compactCompositionPlan(plan);
    expect(estimatePlanDurationMs(compact)).toBeLessThanOrEqual(120_000);
  });
});
