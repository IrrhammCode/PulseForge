
import { useState } from "react";
import { Cloud, Loader2 } from "lucide-react";
import type { StudioProject } from "@/types/studio";
import {
  getClientSyncToken,
  pushProjectToCloud,
} from "@/lib/cloud/sync-client";

interface CloudSyncButtonProps {
  project: StudioProject;
  onSynced?: () => void;
}

export function CloudSyncButton({ project, onSynced }: CloudSyncButtonProps) {
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const hasToken = Boolean(getClientSyncToken());

  if (!hasToken) return null;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={syncing}
        onClick={async () => {
          setSyncing(true);
          setStatus(null);
          try {
            const { audioCount } = await pushProjectToCloud(project);
            setStatus(audioCount ? `Synced +${audioCount} audio` : "Synced");
            onSynced?.();
          } catch (err) {
            setStatus(err instanceof Error ? err.message : "Sync failed");
          } finally {
            setSyncing(false);
          }
        }}
        className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted transition hover:border-accent/40 hover:text-foreground disabled:opacity-50"
        title="Push this project to cloud"
      >
        {syncing ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Cloud className="h-3.5 w-3.5" />
        )}
        <span className="hidden sm:inline">Sync to cloud</span>
      </button>
      {status && (
        <span className="hidden text-[10px] text-muted lg:inline">{status}</span>
      )}
    </div>
  );
}