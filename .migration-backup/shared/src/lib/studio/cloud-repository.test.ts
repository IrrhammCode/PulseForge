import { describe, expect, it } from "vitest";
import { createCloudPrimaryRepository } from "@/lib/studio/cloud-repository";

describe("createCloudPrimaryRepository", () => {
  it("throws with guidance until cloud-primary mode exists", () => {
    expect(() => createCloudPrimaryRepository()).toThrow(/not enabled/i);
  });
});