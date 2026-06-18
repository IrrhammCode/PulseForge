import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DomainEvent } from "@/lib/domain/events";

describe("domainEvents", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("notifies subscribers on emit", async () => {
    const { domainEvents } = await import("@/lib/domain/events");
    const listener = vi.fn();
    const unsubscribe = domainEvents.subscribe(listener);

    domainEvents.emit({
      type: "lyrics_changed",
      projectId: "p1",
      versionId: "v1",
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]![0]).toMatchObject({
      type: "lyrics_changed",
      projectId: "p1",
      versionId: "v1",
    });

    unsubscribe();
    domainEvents.emit({
      type: "audio_changed",
      projectId: "p1",
      versionId: "v1",
    });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  describe("BroadcastChannel relay", () => {
    let posted: DomainEvent[];
    let channelHandler: ((message: MessageEvent<DomainEvent>) => void) | null;

    beforeEach(() => {
      posted = [];
      channelHandler = null;

      class MockBroadcastChannel {
        constructor(public readonly name: string) {}

        set onmessage(handler: ((message: MessageEvent<DomainEvent>) => void) | null) {
          channelHandler = handler;
        }

        postMessage(event: DomainEvent) {
          posted.push(event);
        }
      }

      vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
    });

    it("posts emitted events to the cross-tab channel", async () => {
      const { DOMAIN_EVENTS_BROADCAST_CHANNEL, domainEvents } = await import(
        "@/lib/domain/events"
      );

      domainEvents.emit({
        type: "timeline_edited",
        projectId: "p1",
        versionId: "v1",
      });

      expect(DOMAIN_EVENTS_BROADCAST_CHANNEL).toBe("pulseforge-domain-events");
      expect(posted).toHaveLength(1);
      expect(posted[0]).toMatchObject({
        type: "timeline_edited",
        projectId: "p1",
        versionId: "v1",
      });
    });

    it("dispatches events received from another tab", async () => {
      const { domainEvents } = await import("@/lib/domain/events");
      const listener = vi.fn();
      domainEvents.subscribe(listener);

      channelHandler?.({
        data: {
          type: "analysis_stale",
          projectId: "p1",
          versionId: "v1",
          at: "2026-01-01T00:00:00.000Z",
        },
      } as MessageEvent<DomainEvent>);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener.mock.calls[0]![0]).toMatchObject({
        type: "analysis_stale",
        projectId: "p1",
        versionId: "v1",
      });
      expect(posted).toHaveLength(0);
    });
  });
});