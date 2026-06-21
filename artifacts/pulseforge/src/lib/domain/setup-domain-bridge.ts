import type { DomainEventType } from "@pulseforge/shared/lib/domain/events";
import { domainEvents } from "@pulseforge/shared/lib/domain/events";
import { domainEventCoordinator } from "@pulseforge/shared/lib/domain/event-coordinator";
import { getProject } from "@/lib/domain/project-commands";
import { isAutoReviralEnabled } from "@/lib/hooks/useAutoViralRefresh";
import {
  getClientSyncToken,
  isAutoCloudPushEnabled,
  pushProjectToCloud,
} from "@/lib/cloud/sync-client";
import { setStalePipeline } from "@/lib/domain/stale-pipeline-flag";
import { runAutoOrchestrator } from "@/lib/domain/orchestrator-runners";

const STALE_PIPELINE_EVENTS: DomainEventType[] = [
  "analysis_stale",
  "viral_stale",
  "lyrics_changed",
  "audio_changed",
  "timeline_edited",
];

const CLEAR_STALE_PIPELINE_EVENTS: DomainEventType[] = [
  "analysis_completed",
  "viral_completed",
];

const AUTO_ORCHESTRATE_EVENTS: DomainEventType[] = [
  "lyrics_changed",
  "audio_changed",
  "timeline_edited",
  "viral_stale",
  "analysis_stale",
];

const CLOUD_PUSH_EVENTS: DomainEventType[] = [
  "lyrics_changed",
  "audio_changed",
  "timeline_edited",
  "analysis_completed",
  "viral_completed",
];

const STALE_FLAG_DEBOUNCE_MS = 300;
const ORCHESTRATOR_DEBOUNCE_MS = 400;
const CLOUD_PUSH_DEBOUNCE_MS = 1200;

let bridgeActive = false;
let teardown: (() => void) | null = null;

/** Single coordination point for domain event side effects in the browser. */
export function setupDomainBridge(): () => void {
  if (bridgeActive && teardown) return teardown;
  bridgeActive = true;

  const staleTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const orchestratorTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const cloudPushTimers = new Map<string, ReturnType<typeof setTimeout>>();

  const unsubscribes = [
    domainEventCoordinator.registerHandlers(STALE_PIPELINE_EVENTS, (event) => {
      const existing = staleTimers.get(event.projectId);
      if (existing) clearTimeout(existing);

      staleTimers.set(
        event.projectId,
        setTimeout(() => {
          staleTimers.delete(event.projectId);
          setStalePipeline(event.projectId, true);
        }, STALE_FLAG_DEBOUNCE_MS)
      );
    }),
    domainEventCoordinator.registerHandlers(CLEAR_STALE_PIPELINE_EVENTS, (event) => {
      const existing = staleTimers.get(event.projectId);
      if (existing) {
        clearTimeout(existing);
        staleTimers.delete(event.projectId);
      }
      setStalePipeline(event.projectId, false);
    }),
    domainEventCoordinator.registerHandlers(AUTO_ORCHESTRATE_EVENTS, (event) => {
      if (!isAutoReviralEnabled()) return;

      const existing = orchestratorTimers.get(event.projectId);
      if (existing) clearTimeout(existing);

      orchestratorTimers.set(
        event.projectId,
        setTimeout(() => {
          orchestratorTimers.delete(event.projectId);
          void runAutoOrchestrator(event.projectId);
        }, ORCHESTRATOR_DEBOUNCE_MS)
      );
    }),
    domainEventCoordinator.registerHandlers(CLOUD_PUSH_EVENTS, (event) => {
      if (!isAutoCloudPushEnabled() || !getClientSyncToken()) return;

      const existing = cloudPushTimers.get(event.projectId);
      if (existing) clearTimeout(existing);

      cloudPushTimers.set(
        event.projectId,
        setTimeout(() => {
          cloudPushTimers.delete(event.projectId);
          const project = getProject(event.projectId);
          if (!project) return;
          void pushProjectToCloud(project).catch(() => {
            /* silent — user can manual sync from header */
          });
        }, CLOUD_PUSH_DEBOUNCE_MS)
      );
    }),
    domainEvents.subscribe((event) => {
      void domainEventCoordinator.processEvent(event);
    }),
  ];

  teardown = () => {
    for (const unsubscribe of unsubscribes) unsubscribe();
    for (const timer of staleTimers.values()) clearTimeout(timer);
    for (const timer of orchestratorTimers.values()) clearTimeout(timer);
    for (const timer of cloudPushTimers.values()) clearTimeout(timer);
    staleTimers.clear();
    orchestratorTimers.clear();
    cloudPushTimers.clear();
    bridgeActive = false;
    teardown = null;
  };

  return teardown;
}