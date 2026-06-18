const staleProjects = new Set<string>();
const listeners = new Set<(projectId: string, stale: boolean) => void>();

export function isStalePipeline(projectId: string): boolean {
  return staleProjects.has(projectId);
}

export function subscribeStalePipeline(
  listener: (projectId: string, stale: boolean) => void
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setStalePipeline(projectId: string, stale: boolean): void {
  const wasStale = staleProjects.has(projectId);
  if (stale) staleProjects.add(projectId);
  else staleProjects.delete(projectId);

  if (wasStale !== stale) {
    for (const listener of listeners) listener(projectId, stale);
  }
}