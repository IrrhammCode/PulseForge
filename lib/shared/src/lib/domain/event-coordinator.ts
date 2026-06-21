import type { DomainEvent, DomainEventType } from "@/lib/domain/events";

export type DomainEventHandler = (
  event: DomainEvent
) => void | Promise<void>;

export class DomainEventCoordinator {
  private handlers = new Map<DomainEventType, Set<DomainEventHandler>>();

  registerHandler(
    type: DomainEventType,
    handler: DomainEventHandler
  ): () => void {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(handler);
    return () => set!.delete(handler);
  }

  registerHandlers(
    types: DomainEventType[],
    handler: DomainEventHandler
  ): () => void {
    const unsubscribes = types.map((type) => this.registerHandler(type, handler));
    return () => {
      for (const unsubscribe of unsubscribes) unsubscribe();
    };
  }

  async processEvent(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.type);
    if (!handlers?.size) return;

    for (const handler of handlers) {
      try {
        await handler(event);
      } catch {
        // handlers must not break the event chain
      }
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}

export const domainEventCoordinator = new DomainEventCoordinator();