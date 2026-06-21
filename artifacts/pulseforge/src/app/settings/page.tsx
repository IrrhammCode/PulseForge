
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Download, RefreshCw, Trash2, Upload } from "lucide-react";
import { PageHeader, Panel } from "@/components/ui/editorial";
import { CloudConflictPanel } from "@/components/settings/CloudConflictPanel";
import { resetOnboarding } from "@/lib/onboarding";
import { useStudioProjects } from "@/lib/hooks/useStudioProjects";
import {
  clearAllProjectsAndAudio,
  exportProjectsBundle,
  exportProjectsBundleWithAudio,
  importProjectsBundle,
  importProjectsBundleWithAudio,
  validateImportBundle,
  type ProjectsExportBundle,
} from "@/lib/studio/repository";
import {
  isAutoReviralEnabled,
  setAutoReviralEnabled,
} from "@/lib/hooks/useAutoViralRefresh";
import {
  createCloudSyncSession,
  fetchSyncSessionInfo,
  getClientSyncToken,
  isAutoCloudPushEnabled,
  previewPullConflicts,
  pullProjectsFromCloud,
  pushAllProjectsToCloud,
  setAutoCloudPushEnabled,
  setClientSyncToken,
  type CloudSyncMode,
  type SyncSessionInfo,
} from "@/lib/cloud/sync-client";
import type {
  ConflictResolution,
  SyncConflict,
} from "@pulseforge/shared/lib/cloud/sync-conflicts";

function defaultResolutions(conflicts: SyncConflict[]): Record<string, ConflictResolution> {
  return Object.fromEntries(conflicts.map((c) => [c.projectId, "local" as const]));
}

export default function SettingsPage() {
  const { projects, refresh } = useStudioProjects();
  const projectCount = projects.length;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [autoReviral, setAutoReviral] = useState(false);
  const [autoCloudPush, setAutoCloudPush] = useState(false);

  useEffect(() => {
    setAutoReviral(isAutoReviralEnabled());
    setAutoCloudPush(isAutoCloudPushEnabled());
  }, []);

  const [exportingFull, setExportingFull] = useState(false);
  const [syncToken, setSyncToken] = useState("");
  const [sessionLabel, setSessionLabel] = useState("");
  const [sessionInfo, setSessionInfo] = useState<SyncSessionInfo | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [cloudSyncMode, setCloudSyncMode] = useState<CloudSyncMode>("merge");
  const [pullConflicts, setPullConflicts] = useState<SyncConflict[]>([]);
  const [conflictResolutions, setConflictResolutions] = useState<
    Record<string, ConflictResolution>
  >({});

  useEffect(() => {
    setSyncToken(getClientSyncToken() ?? "");
    void fetchSyncSessionInfo().then(setSessionInfo);
  }, []);

  const handleResetOnboarding = () => {
    resetOnboarding();
    window.location.assign("/welcome");
  };

  const downloadBundle = (bundle: ProjectsExportBundle, suffix = "") => {
    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pulseforge-backup${suffix}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    downloadBundle(exportProjectsBundle());
  };

  const handleExportWithAudio = async () => {
    setExportingFull(true);
    try {
      const bundle = await exportProjectsBundleWithAudio();
      downloadBundle(bundle, "-with-audio");
    } finally {
      setExportingFull(false);
    }
  };

  const handleImport = async (file: File) => {
    setImportStatus(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text) as unknown;
      if (!validateImportBundle(data)) {
        setImportStatus("Invalid backup file format.");
        return;
      }
      const bundle = data as ProjectsExportBundle;
      const result = bundle.audio?.length
        ? await importProjectsBundleWithAudio(bundle, "merge")
        : { ...importProjectsBundle(bundle, "merge"), audioRestored: 0 };
      refresh();
      setImportStatus(
        `Imported ${result.imported} project(s)${result.skipped ? `, merged ${result.skipped}` : ""}${
          result.audioRestored ? `, restored ${result.audioRestored} audio blob(s)` : ". Re-upload demos if audio was not in the backup."
        }`
      );
    } catch {
      setImportStatus("Could not read backup file.");
    }
  };

  const handleClearAll = async () => {
    if (
      !confirm(
        `Delete all ${projectCount} project(s) and audio? This cannot be undone.`
      )
    ) {
      return;
    }
    await clearAllProjectsAndAudio();
    window.location.reload();
  };

  const refreshSessionInfo = async () => {
    const info = await fetchSyncSessionInfo();
    setSessionInfo(info);
    return info;
  };

  const handleCreateSession = async () => {
    setSyncing(true);
    setSyncStatus(null);
    try {
      const { token, label } = await createCloudSyncSession({
        label: sessionLabel.trim() || undefined,
      });
      setSyncToken(token);
      await refreshSessionInfo();
      setSyncStatus(`Created sync session "${label}". Token saved locally.`);
    } catch (err) {
      setSyncStatus(err instanceof Error ? err.message : "Could not create session");
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveToken = async () => {
    setClientSyncToken(syncToken);
    const info = await refreshSessionInfo();
    setSyncStatus(
      info
        ? `Token saved — signed in as ${info.label ?? info.kind}.`
        : "Token saved locally (could not verify with server)."
    );
  };

  const clearPullConflicts = () => {
    setPullConflicts([]);
    setConflictResolutions({});
  };

  const finishPull = async (resolutions?: Record<string, ConflictResolution>) => {
    const { count, audioCount, skipped, conflicts, keptLocal, keptCloud } =
      await pullProjectsFromCloud(cloudSyncMode, { resolutions });
    refresh();
    clearPullConflicts();
    const conflictNote =
      conflicts.length > 0
        ? `, resolved ${conflicts.length} conflict(s) (kept ${keptLocal} local / ${keptCloud} cloud)`
        : "";
    setSyncStatus(
      `Pulled ${count} project(s) from cloud (${cloudSyncMode})${
        skipped ? `, merged ${skipped}` : ""
      }${audioCount ? ` + ${audioCount} audio blob(s)` : ""}${conflictNote}.`
    );
  };

  const handlePull = async () => {
    setSyncing(true);
    setSyncStatus(null);
    try {
      if (cloudSyncMode === "merge" && pullConflicts.length === 0) {
        const preview = await previewPullConflicts();
        if (preview.conflicts.length > 0) {
          setPullConflicts(preview.conflicts);
          setConflictResolutions(defaultResolutions(preview.conflicts));
          setSyncStatus(
            `${preview.conflicts.length} conflict(s) found — choose resolutions below, then confirm pull.`
          );
          return;
        }
      }

      if (pullConflicts.length > 0) {
        await finishPull(conflictResolutions);
      } else {
        await finishPull();
      }
    } catch (err) {
      setSyncStatus(err instanceof Error ? err.message : "Pull failed");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        badge="Preferences"
        title="Settings"
        description="Local storage and cloud sync preferences. Projects stay in this browser; optional backend mirror uses session or admin tokens."
      />

      <div className="mt-8 space-y-4">
        <Panel>
          <h2 className="font-semibold">Backup & restore</h2>
          <p className="mt-2 text-sm text-muted">
            Export project metadata as JSON. Use full backup to include IndexedDB audio blobs
            (larger file).
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={handleExport} className="btn-secondary text-sm">
              <Download className="h-4 w-4" />
              Export metadata
            </button>
            <button
              type="button"
              onClick={() => void handleExportWithAudio()}
              disabled={exportingFull}
              className="btn-secondary text-sm"
            >
              <Download className="h-4 w-4" />
              {exportingFull ? "Packing audio…" : "Export with audio"}
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary text-sm"
            >
              <Upload className="h-4 w-4" />
              Import projects
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImport(file);
                e.target.value = "";
              }}
            />
          </div>
          {importStatus && (
            <p className="mt-3 text-sm text-muted">{importStatus}</p>
          )}
        </Panel>

        <Panel>
          <h2 className="font-semibold">Cloud sync (optional)</h2>
          <p className="mt-2 text-sm text-muted">
            Mirror projects and IndexedDB audio to the backend SQLite store. Create a personal
            sync session, or paste the bootstrap admin token from{" "}
            <code className="text-xs">PULSEFORGE_SYNC_TOKEN</code> in{" "}
            <code className="text-xs">backend/.env</code>.
          </p>

          {sessionInfo && (
            <p className="mt-3 border-2 border-foreground bg-surface px-3 py-2 text-xs text-muted">
              Signed in as{" "}
              <span className="font-medium text-foreground">
                {sessionInfo.label ?? sessionInfo.kind}
              </span>
              {sessionInfo.kind === "session" && sessionInfo.sessionId && (
                <span className="ml-1 text-muted">({sessionInfo.sessionId.slice(0, 8)}…)</span>
              )}
            </p>
          )}

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input
              type="text"
              value={sessionLabel}
              onChange={(e) => setSessionLabel(e.target.value)}
              placeholder="Session label (e.g. MacBook)"
              className="w-full border-2 border-foreground bg-surface px-3 py-2 text-sm outline-none focus:bg-foreground/5"
            />
            <button
              type="button"
              disabled={syncing}
              className="btn-secondary text-sm"
              onClick={() => void handleCreateSession()}
            >
              Create sync session
            </button>
          </div>

          <input
            type="password"
            value={syncToken}
            onChange={(e) => setSyncToken(e.target.value)}
            placeholder="Bearer token (session or bootstrap admin)"
            className="mt-3 w-full border-2 border-foreground bg-surface px-3 py-2 text-sm outline-none focus:bg-foreground/5"
          />
          <label className="mt-3 flex cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={autoCloudPush}
              onChange={(e) => {
                setAutoCloudPush(e.target.checked);
                setAutoCloudPushEnabled(e.target.checked);
              }}
              className="h-4 w-4 border-2 border-foreground accent-foreground"
            />
            Auto-push projects to cloud on save (debounced, requires token)
          </label>
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="cloud-sync-mode"
                checked={cloudSyncMode === "merge"}
                onChange={() => {
                  setCloudSyncMode("merge");
                  clearPullConflicts();
                }}
                className="accent-foreground"
              />
              Merge (keep local projects not in cloud)
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="cloud-sync-mode"
                checked={cloudSyncMode === "replace"}
                onChange={() => {
                  setCloudSyncMode("replace");
                  clearPullConflicts();
                }}
                className="accent-foreground"
              />
              Replace (cloud overwrites all local)
            </label>
          </div>

          <CloudConflictPanel
            conflicts={pullConflicts}
            resolutions={conflictResolutions}
            onChange={(projectId, resolution) =>
              setConflictResolutions((prev) => ({ ...prev, [projectId]: resolution }))
            }
            onResolveAll={(resolution) =>
              setConflictResolutions(
                Object.fromEntries(pullConflicts.map((c) => [c.projectId, resolution]))
              )
            }
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary text-sm"
              onClick={() => void handleSaveToken()}
            >
              Save token
            </button>
            <button
              type="button"
              disabled={syncing}
              className="btn-secondary text-sm"
              onClick={async () => {
                setSyncing(true);
                setSyncStatus(null);
                clearPullConflicts();
                try {
                  const { count, audioCount } = await pushAllProjectsToCloud(cloudSyncMode);
                  refresh();
                  setSyncStatus(
                    `Pushed ${count} project(s) to cloud (${cloudSyncMode})${audioCount ? ` + ${audioCount} audio blob(s)` : ""}.`
                  );
                } catch (err) {
                  setSyncStatus(err instanceof Error ? err.message : "Push failed");
                } finally {
                  setSyncing(false);
                }
              }}
            >
              Push to cloud
            </button>
            <button
              type="button"
              disabled={syncing}
              className="btn-secondary text-sm"
              onClick={() => void handlePull()}
            >
              {pullConflicts.length > 0 ? "Confirm pull" : "Pull from cloud"}
            </button>
            {pullConflicts.length > 0 && (
              <button
                type="button"
                disabled={syncing}
                className="btn-secondary text-sm"
                onClick={() => {
                  clearPullConflicts();
                  setSyncStatus(null);
                }}
              >
                Cancel
              </button>
            )}
          </div>
          {syncStatus && <p className="mt-3 text-sm text-muted">{syncStatus}</p>}
        </Panel>

        <Panel>
          <h2 className="font-semibold">Viral Lab</h2>
          <p className="mt-2 text-sm text-muted">
            Automatically re-run Viral Lab when lyrics or audio change and a prior snapshot
            exists.
          </p>
          <label className="mt-4 flex cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={autoReviral}
              onChange={(e) => {
                setAutoReviral(e.target.checked);
                setAutoReviralEnabled(e.target.checked);
              }}
              className="h-4 w-4 border-2 border-foreground accent-foreground"
            />
            Auto re-viral on stale content
          </label>
        </Panel>

        <Panel>
          <h2 className="font-semibold">Onboarding</h2>
          <p className="mt-2 text-sm text-muted">
            Require the Home landing page before Dashboard, Studio, and other app routes.
          </p>
          <button
            type="button"
            onClick={handleResetOnboarding}
            className="btn-secondary mt-4 text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Reset welcome tour
          </button>
        </Panel>

        <Panel>
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
            <div>
              <h2 className="font-semibold">Danger zone</h2>
              <p className="mt-2 text-sm text-muted">
                {projectCount} project{projectCount !== 1 ? "s" : ""} stored locally.
                Clearing removes all project metadata and IndexedDB audio.
              </p>
              <button
                type="button"
                onClick={handleClearAll}
                disabled={projectCount === 0}
                className="mt-4 inline-flex items-center gap-2 border-2 border-foreground px-4 py-2 text-sm font-medium text-foreground transition hover:bg-foreground hover:text-background disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
                Clear all projects & audio
              </button>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}