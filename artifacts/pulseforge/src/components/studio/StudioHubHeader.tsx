
import { Link } from "wouter";
import { ArrowLeft, ChevronDown, Copy } from "lucide-react";
import { CloudSyncButton } from "@/components/studio/CloudSyncButton";
import { LaunchButton } from "@/components/studio/LaunchButton";
import { ViralLabCTA } from "@/components/viral/ViralLabCTA";
import type { StudioProject } from "@/types/studio";
import { PROJECT_STATUSES, primaryGenreLabel, primaryMoodLabel } from "@/types/studio";
import { copyVersionAudio } from "@/lib/studio/audio-db";
import {
  commandAddVersion,
  commandSetActiveVersion,
  getProject,
} from "@/lib/domain/project-commands";

interface StudioHubHeaderProps {
  project: StudioProject;
  onProjectChange: () => void;
}

export function StudioHubHeader({ project, onProjectChange }: StudioHubHeaderProps) {
  const status = PROJECT_STATUSES[project.status];
  const activeVersion = project.versions.find((v) => v.id === project.activeVersionId);

  const handleVersionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    commandSetActiveVersion(project.id, e.target.value);
    onProjectChange();
  };

  const handleNewVersion = async () => {
    const fromId = project.activeVersionId;
    const hadAudio = project.versions.find((v) => v.id === fromId)?.audio;
    commandAddVersion(project.id);
    if (hadAudio) {
      const updated = getProject(project.id);
      if (updated) {
        await copyVersionAudio(project.id, fromId, updated.activeVersionId);
      }
    }
    onProjectChange();
  };

  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <Link
          href="/studio"
          className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted transition hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All projects
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="truncate text-xl font-bold md:text-2xl">{project.title}</h1>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${status.className}`}
          >
            {status.label}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted">
          {project.artistName} · {primaryGenreLabel(project)} · {primaryMoodLabel(project)}
          {project.bpmTarget ? ` · ${project.bpmTarget} BPM` : ""}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <LaunchButton project={project} onProjectChange={onProjectChange} />
        <CloudSyncButton project={project} />
        <ViralLabCTA projectId={project.id} compact />
        <button
          type="button"
          onClick={handleNewVersion}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted transition hover:border-accent/40 hover:text-foreground"
        >
          <Copy className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">New version</span>
        </button>
        <div className="relative">
          <select
            value={project.activeVersionId}
            onChange={handleVersionChange}
            className="appearance-none rounded-xl border border-border bg-surface-elevated py-2 pl-3 pr-8 text-sm outline-none focus:border-accent/40"
          >
            {project.versions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        </div>
        {activeVersion && (
          <span className="hidden text-xs text-muted sm:inline">
            Active: {activeVersion.label}
          </span>
        )}
      </div>
    </div>
  );
}