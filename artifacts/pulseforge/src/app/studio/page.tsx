
import { useState } from "react";
import { Link } from "wouter";
import { BarChart3, LayoutGrid, Plus, Search } from "lucide-react";
import { useStudioProjects } from "@/lib/hooks/useStudioProjects";
import { ProjectCard } from "@/components/studio/ProjectCard";
import { NewProjectForm } from "@/components/studio/NewProjectForm";
import { FillExampleButton } from "@/components/studio/FillExampleButton";
import {
  buildExampleCreateInput,
  getStudioExamplePreset,
} from "@pulseforge/shared/lib/studio/example-presets";
import { useRouter } from "@/lib/navigation-compat";
import { computeDashboardStats } from "@/lib/dashboard";
import type { StudioProjectStatus } from "@/types/studio";

export default function ProjectsPage() {
  const router = useRouter();
  const { projects, ready, create, remove, refresh } = useStudioProjects();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | StudioProjectStatus>("all");
  const [sortBy, setSortBy] = useState<"updated" | "name" | "score">("updated");

  const stats = computeDashboardStats(projects);

  const filteredProjects = [...projects]
    .filter((p) => {
      const q = search.toLowerCase();
      const matchesSearch =
        p.title.toLowerCase().includes(q) || p.artistName.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "name") {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === "score") {
        const aScore =
          a.versions.find((v) => v.id === a.activeVersionId)?.analysis?.hitPotential.overall ?? 0;
        const bScore =
          b.versions.find((v) => v.id === b.activeVersionId)?.analysis?.hitPotential.overall ?? 0;
        return bScore - aScore;
      }
      // updated
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const handleDelete = (id: string) => {
    if (confirm("Delete this project? This cannot be undone.")) {
      remove(id);
    }
  };

  const templates = [
    { title: "Midnight Drive", artistName: "Nova Ray", genre: "Indie Pop", mood: "Energetic", bpmTarget: 120 },
    { title: "Echoes in the Rain", artistName: "Luna Vale", genre: "Indie Pop", mood: "Melancholic" },
    { title: "Run the Night", artistName: "Kai Meridian", genre: "Dance Pop", mood: "Energetic" },
    { title: "Static Between Us", artistName: "Julian Vale", genre: "Pop", mood: "Melancholic", bpmTarget: 74 },
  ];

  const handleCreateTemplate = (tpl: (typeof templates)[0]) => {
    create(tpl);
  };

  const handleCreateExample = (presetId: string) => {
    const preset = getStudioExamplePreset(presetId);
    if (!preset) return;
    const project = create(buildExampleCreateInput(preset));
    router.push(`/studio/${project.id}/write`);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-light">
            Projects
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">
            Your projects
          </h1>
          <p className="mt-1 max-w-lg text-sm text-muted md:text-base">
            Manage your tracks in the full studio pipeline.
          </p>
        </div>
        <div className="w-full md:w-auto md:max-w-md shrink-0">
          <NewProjectForm onCreate={create} />
        </div>
      </div>

      {/* Mini Stats Row */}
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface-elevated p-4">
          <div className="flex items-center gap-2 text-accent-light">
            <LayoutGrid className="h-4 w-4" />
            <span className="text-[10px] uppercase tracking-wider">Total Projects</span>
          </div>
          <p className="mt-2 text-3xl font-bold tabular-nums">{stats.totalProjects}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-elevated p-4">
          <div className="flex items-center gap-2 text-accent-light">
            <BarChart3 className="h-4 w-4" />
            <span className="text-[10px] uppercase tracking-wider">Analyzed</span>
          </div>
          <p className="mt-2 text-3xl font-bold tabular-nums">{stats.analyzedProjects}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-elevated p-4">
          <div className="flex items-center gap-2 text-accent-light">
            <BarChart3 className="h-4 w-4" />
            <span className="text-[10px] uppercase tracking-wider">Avg Hit Score</span>
          </div>
          <p className="mt-2 text-3xl font-bold tabular-nums">
            {stats.avgHitScore != null ? stats.avgHitScore : "N/A"}
          </p>
        </div>
      </div>

      {/* Toolbar: Search + Filter + Sort (shown only when projects exist) */}
      {ready && projects.length > 0 && (
        <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-border bg-surface-elevated p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or artist..."
              className="w-full rounded-xl border border-border bg-surface pl-9 py-2 text-sm placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </div>

          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | StudioProjectStatus)}
              className="rounded-xl border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none"
            >
              <option value="all">All status</option>
              <option value="draft">Draft</option>
              <option value="crafting">Crafting</option>
              <option value="analyzing">Analyzing</option>
              <option value="ready">Ready</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "updated" | "name" | "score")}
              className="rounded-xl border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none"
            >
              <option value="updated">Last updated</option>
              <option value="name">Name A-Z</option>
              <option value="score">Highest score</option>
            </select>
          </div>
        </div>
      )}

      {/* Projects Grid / List */}
      {!ready && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-border/50" />
          ))}
        </div>
      )}

      {/* Content */}
      {ready && projects.length === 0 && (
        // Cleaner & more balanced empty state layout
        <div className="mt-10">
          {/* Centered hero message */}
          <div className="mx-auto mb-8 max-w-md text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-muted">
              <Plus className="h-6 w-6 text-accent-light" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">No projects yet</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              Start your Music Studio OS journey. Choose how you&apos;d like to begin.
            </p>
          </div>

          {/* 2x2 balanced grid - much cleaner than 4 equal columns */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Primary: Create from Scratch */}
            <div className="flex flex-col rounded-2xl border border-border bg-surface-elevated p-6">
              <div className="flex-1">
                <h3 className="text-lg font-semibold">Create from Scratch</h3>
                <p className="mt-2 text-sm text-muted">
                  Start a brand new project. Choose your own title, artist, genre and mood.
                </p>
              </div>
              <div className="mt-5">
                <NewProjectForm onCreate={create} />
              </div>
            </div>

            {/* Recommended: Start from Template */}
            <div className="flex flex-col rounded-2xl border border-accent/40 bg-accent-muted/5 p-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Fill examples</h3>
                <span className="rounded-full bg-accent-muted px-2.5 py-0.5 text-[10px] font-semibold tracking-wider text-accent-light">
                  Ready to generate
                </span>
              </div>
              <p className="text-sm text-muted">
                Pre-filled lyrics, brief, vocal & arrangement — one click to Write, then Generate Full
                Song.
              </p>
              <div className="mt-5">
                <FillExampleButton onFill={handleCreateExample} />
              </div>
            </div>

            <div className="flex flex-col rounded-2xl border border-border bg-surface-elevated p-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Start from Template</h3>
                <span className="rounded-full bg-surface px-2.5 py-0.5 text-[10px] font-semibold tracking-wider text-muted">
                  Quick
                </span>
              </div>
              <p className="text-sm text-muted">Pick a starter title — fill lyrics yourself.</p>

              <div className="mt-4 flex-1 space-y-2">
                {templates.map((tpl, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleCreateTemplate(tpl)}
                    className="w-full rounded-xl border border-accent/20 bg-surface px-4 py-2.5 text-left text-sm font-medium transition hover:border-accent/50 hover:bg-accent-muted/10 active:bg-accent-muted/20"
                  >
                    {tpl.title} <span className="text-muted">by {tpl.artistName}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick wins row */}
            <div className="flex flex-col rounded-2xl border border-border bg-surface-elevated p-6 md:col-span-2 lg:col-span-1">
              <div className="flex-1">
                <h3 className="text-lg font-semibold">Try with Demo Track</h3>
                <p className="mt-2 text-sm text-muted">
                  Test the full analysis pipeline instantly with a sample track. No setup needed.
                </p>
              </div>
              <Link
                href="/analyze"
                className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90"
              >
                Open Quick Analyze
              </Link>
            </div>

            <div className="flex flex-col rounded-2xl border border-border bg-surface-elevated p-6 md:col-span-2 lg:col-span-1">
              <div className="flex-1">
                <h3 className="text-lg font-semibold">Import from Musixmatch</h3>
                <p className="mt-2 text-sm text-muted">
                  Search the catalog and pull in real lyrics, metadata and analysis in seconds.
                </p>
              </div>
              <Link
                href="/analyze"
                className="mt-5 inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition hover:bg-surface-elevated"
              >
                Search &amp; Import
              </Link>
            </div>
          </div>
        </div>
      )}

      {ready && projects.length > 0 && (
        <>
          {/* No match message */}
          {filteredProjects.length === 0 && (
            <div className="mt-8 rounded-2xl border border-dashed border-border p-8 text-center">
              <p className="text-muted">No projects match your search or filter.</p>
            </div>
          )}

          {/* Projects Grid */}
          {filteredProjects.length > 0 && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onDelete={handleDelete}
                  onRefresh={refresh}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Quick Analyze Promo (always visible, clean card) */}
      <div className="mt-10 rounded-2xl border border-accent/30 bg-accent-muted/5 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold text-accent-light">Quick Analyze</h3>
            <p className="mt-1 text-sm text-muted">
              Have a released track ready? Score it instantly with full Musixmatch intelligence — no studio needed.
            </p>
          </div>
          <Link href="/analyze" className="btn-primary shrink-0 text-sm">
            Open Quick Analyze
          </Link>
        </div>
      </div>
    </div>
  );
}