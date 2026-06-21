export type DomainEventType =
  | "project_created"
  | "lyrics_changed"
  | "audio_changed"
  | "analysis_completed"
  | "analysis_stale"
  | "viral_completed"
  | "viral_stale"
  | "launch_plan_updated"
  | "what_if_changed"
  | "timeline_edited"
  | "workflow_transition"
  | "orchestrator_run";

export interface DomainEvent {
  type: DomainEventType;
  projectId: string;
  versionId?: string;
  at: string;
  payload?: Record<string, unknown>;
}

type DomainEventListener = (event: DomainEvent) => void;

export const DOMAIN_EVENTS_BROADCAST_CHANNEL = "pulseforge-domain-events";

class DomainEventBus {
  private listeners = new Set<DomainEventListener>();
  private channel: BroadcastChannel | null = null;

  constructor() {
    if (typeof BroadcastChannel !== "undefined") {
      this.channel = new BroadcastChannel(DOMAIN_EVENTS_BROADCAST_CHANNEL);
      this.channel.onmessage = (message: MessageEvent<DomainEvent>) => {
        if (!message.data?.type || !message.data?.projectId) return;
        this.dispatchLocal(message.data);
      };
    }
  }

  subscribe(listener: DomainEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: Omit<DomainEvent, "at"> & { at?: string }): void {
    const full: DomainEvent = { ...event, at: event.at ?? new Date().toISOString() };
    this.dispatchLocal(full);
    this.channel?.postMessage(full);
  }

  private dispatchLocal(event: DomainEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // listeners must not break command path
      }
    }
  }
}

export const domainEvents = new DomainEventBus();

export function emitDomainEvent(
  event: Omit<DomainEvent, "at"> & { at?: string }
): void {
  domainEvents.emit(event);
}