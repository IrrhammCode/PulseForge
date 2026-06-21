import type { IProjectRepository } from "@/lib/studio/repository-port";

/**
 * Placeholder for a future cloud-primary repository (reads/writes via `/api/cloud`).
 * Today projects stay local-first; use `sync-client` push/pull and `getProjectRepository()`.
 */
export function createCloudPrimaryRepository(): IProjectRepository {
  throw new Error(
    "Cloud-primary repository is not enabled. Use getProjectRepository() with Settings push/pull."
  );
}