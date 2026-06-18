import { describe, expect, it, vi } from "vitest";
import { DomainEventCoordinator } from "@/lib/domain/event-coordinator";
import type { DomainEvent } from "@/lib/domain/events";

function makeEvent(type: DomainEvent["type"]): DomainEvent {
  return {
    type,
    projectId: "p1",
    versionId: "v1",
    at: "2026-01-01T00:00:00.000Z",
  };
}

describe("DomainEventCoordinator", () => {
  it("runs handlers for a registered event type in sequence", async () => {
    const coordinator = new DomainEventCoordinator();
    const order: number[] = [];

    coordinator.registerHandler("lyrics_changed", async () => {
      order.push(1);
    });
    coordinator.registerHandler("lyrics_changed", () => {
      order.push(2);
    });

    await coordinator.processEvent(makeEvent("lyrics_changed"));

    expect(order).toEqual([1, 2]);
  });

  it("ignores handlers for other event types", async () => {
    const coordinator = new DomainEventCoordinator();
    const handler = vi.fn();

    coordinator.registerHandler("audio_changed", handler);
    await coordinator.processEvent(makeEvent("lyrics_changed"));

    expect(handler).not.toHaveBeenCalled();
  });

  it("unsubscribes handlers", async () => {
    const coordinator = new DomainEventCoordinator();
    const handler = vi.fn();
    const unsubscribe = coordinator.registerHandler("timeline_edited", handler);

    unsubscribe();
    await coordinator.processEvent(makeEvent("timeline_edited"));

    expect(handler).not.toHaveBeenCalled();
  });

  it("registerHandlers wires one handler to multiple types", async () => {
    const coordinator = new DomainEventCoordinator();
    const handler = vi.fn();
    coordinator.registerHandlers(["analysis_stale", "viral_stale"], handler);

    await coordinator.processEvent(makeEvent("analysis_stale"));
    await coordinator.processEvent(makeEvent("viral_stale"));

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("continues the chain when a handler throws", async () => {
    const coordinator = new DomainEventCoordinator();
    const second = vi.fn();

    coordinator.registerHandler("lyrics_changed", () => {
      throw new Error("boom");
    });
    coordinator.registerHandler("lyrics_changed", second);

    await coordinator.processEvent(makeEvent("lyrics_changed"));

    expect(second).toHaveBeenCalledTimes(1);
  });
});