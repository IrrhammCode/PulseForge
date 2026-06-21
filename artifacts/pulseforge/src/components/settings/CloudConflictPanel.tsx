
import type {
  ConflictResolution,
  SyncConflict,
} from "@pulseforge/shared/lib/cloud/sync-conflicts";

interface CloudConflictPanelProps {
  conflicts: SyncConflict[];
  resolutions: Record<string, ConflictResolution>;
  onChange: (projectId: string, resolution: ConflictResolution) => void;
  onResolveAll: (resolution: ConflictResolution) => void;
}

export function CloudConflictPanel({
  conflicts,
  resolutions,
  onChange,
  onResolveAll,
}: CloudConflictPanelProps) {
  if (!conflicts.length) return null;

  return (
    <div
      data-testid="cloud-conflict-panel"
      className="mt-4 rounded-xl border border-warning/40 bg-warning/5 p-4"
    >
      <p className="text-sm font-semibold text-warning">
        {conflicts.length} sync conflict{conflicts.length > 1 ? "s" : ""} detected
      </p>
      <p className="mt-1 text-xs text-muted">
        Same project changed locally and in cloud — pick which copy to keep per project.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-secondary text-xs"
          onClick={() => onResolveAll("local")}
        >
          Keep all local
        </button>
        <button
          type="button"
          className="btn-secondary text-xs"
          onClick={() => onResolveAll("cloud")}
        >
          Keep all cloud
        </button>
      </div>
      <ul className="mt-4 space-y-3">
        {conflicts.map((c) => (
          <li
            key={c.projectId}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-xs"
          >
            <p className="font-medium">{c.title}</p>
            <p className="mt-1 text-muted">
              Local {new Date(c.localUpdatedAt).toLocaleString()} · Cloud{" "}
              {new Date(c.cloudUpdatedAt).toLocaleString()}
            </p>
            <div className="mt-2 flex gap-3">
              <label className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="radio"
                  name={`conflict-${c.projectId}`}
                  checked={(resolutions[c.projectId] ?? "local") === "local"}
                  onChange={() => onChange(c.projectId, "local")}
                  className="accent-accent"
                />
                Keep local
              </label>
              <label className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="radio"
                  name={`conflict-${c.projectId}`}
                  checked={resolutions[c.projectId] === "cloud"}
                  onChange={() => onChange(c.projectId, "cloud")}
                  className="accent-accent"
                />
                Keep cloud
              </label>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}