import { describe, expect, it, beforeEach } from "vitest";
import {
  buildCuratedTrendFeed,
  getCachedTrendFeed,
  getLiveTrendFeed,
  resetTrendFeedCache,
} from "@/lib/trends/feed";

describe("trend feed", () => {
  beforeEach(() => {
    resetTrendFeedCache();
  });

  it("returns curated keywords without remote URL", async () => {
    const feed = await getLiveTrendFeed();
    expect(feed.keywords.length).toBeGreaterThan(5);
    expect(feed.source).toBe("curated");
    expect(feed.refreshedAt).toBeTruthy();
  });

  it("serves cached feed synchronously", async () => {
    await getLiveTrendFeed();
    const cached = getCachedTrendFeed();
    expect(cached.keywords.length).toBeGreaterThan(0);
  });

  it("includes seasonal keywords for summer months", () => {
    const feed = buildCuratedTrendFeed(new Date("2026-07-15T12:00:00.000Z"));
    expect(feed.keywords.some((k) => k.includes("summer") || k === "party")).toBe(true);
  });
});