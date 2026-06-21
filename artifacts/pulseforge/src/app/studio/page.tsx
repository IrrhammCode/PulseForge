
import { useState } from "react";
import { Link } from "wouter";
import { BarChart3, LayoutGrid, Plus, Search } from "lucide-react";
import { useStudioProjects } from "@/lib/hooks/useStudioProjects";
import { ProjectCard } from "@/components/studio/ProjectCard";
import { NewProjectForm } from "@/components/studio/NewProjectForm";
import { FillExampleButton } from "@/components/studio/FillExampleButton";
import { PageHeader } from "@/components/ui/editorial";
import {
  buildExampleCreateInput,
  getStudioExamplePreset,
} from "@pulseforge/shared/lib/studio/example-presets";
import { useRouter } from "@/lib/navigation-compat";
import { computeDashboardStats } from "@/lib/dashboard";
import type { StudioProjectStatus } from "@/types/studio";

export default function ProjectsPage() {
  const router = useRouter();
  const { projects, ready, create, remove } = useStudioProjects();

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
      <PageHeader
        badge="Studio"
        title="Projects"
        description="Manage your tracks in the full studio pipeline."
        actions={<NewProjectForm onCreate={create} />}
      />

      {/* Mini Stats Row */}
      <div className="mt-8 grid grid-cols-1 border-2 border-foreground bg-surface sm:grid-cols-3">
        <div className="border-b-2 border-foreground p-5 sm:border-b-0 sm:border-r-2">
          <div className="flex items-center gap-2 text-muted">
            <LayoutGrid className="h-4 w-4" />
            <span className="landing-eyebrow">Total Projects</span>
          </div>
          <p className="mt-2 font-display text-4xl leading-none tabular-nums">{stats.totalProjects}</p>
        </div>
        <div className="border-b-2 border-foreground p-5 sm:border-b-0 sm:border-r-2">
          <div className="flex items-center gap-2 text-muted">
            <BarChart3 className="h-4 w-4" />
            <span className="landing-eyebrow">Analyzed</span>
          </div>
          <p className="mt-2 font-display text-4xl leading-none tabular-nums">{stats.analyzedProjects}</p>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-2 text-muted">
            <BarChart3 className="h-4 w-4" />
            <span className="landing-eyebrow">Avg Hit Score</span>
          </div>
          <p className="mt-2 font-display text-4xl leading-none tabular-nums">
            {stats.avgHitScore != null ? stats.avgHitScore : "N/A"}
          </p>
        </div>
      </div>

      {/* Toolbar: Search + Filter + Sort (shown only when projects exist) */}
      {ready && projects.length > 0 && (
        <div className="mt-8 flex flex-col gap-3 border-2 border-foreground bg-surface p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or artist..."
              className="w-full border-2 border-foreground bg-surface pl-9 py-2 text-sm placeholder:text-muted outline-none focus:bg-foreground/5"
            />
          </div>

          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | StudioProjectStatus)}
              className="border-2 border-foreground bg-surface px-3 py-2 text-sm outline-none focus:bg-foreground/5"
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
              className="border-2 border-foreground bg-surface px-3 py-2 text-sm outline-none focus:bg-foreground/5"
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
            <div key={i} className="h-48 animate-pulse border-2 border-foreground bg-foreground/5" />
          ))}
        </div>
      )}

      {/* Content */}
      {ready && projects.length === 0 && (
        // Cleaner & more balanced empty state layout
        <div className="mt-10">
          {/* Centered hero message */}
          <div className="mx-auto mb-8 max-w-md text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border-2 border-foreground bg-surface">
              <Plus className="h-6 w-6 text-foreground" />
            </div>
            <h2 className="font-display text-3xl uppercase leading-none tracking-tight">No projects yet</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              Start your Music Studio OS journey. Choose how you&apos;d like to begin.
            </p>
          </div>

          {/* 2x2 balanced grid - much cleaner than 4 equal columns */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Primary: Create from Scratch */}
            <div className="flex flex-col border-2 border-foreground bg-surface p-6">
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
            <div className="flex flex-col border-2 border-foreground bg-surface p-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Fill examples</h3>
                <span className="bg-foreground px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-background">
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

            <div className="flex flex-col border-2 border-foreground bg-surface p-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Start from Template</h3>
                <span className="border-2 border-foreground px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground">
                  Quick
                </span>
              </div>
              <p className="text-sm text-muted">Pick a starter title — fill lyrics yourself.</p>

              <div className="mt-4 flex-1 space-y-2">
                {templates.map((tpl, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleCreateTemplate(tpl)}
                    className="w-full border-2 border-foreground bg-surface px-4 py-2.5 text-left text-sm font-medium transition hover:bg-foreground hover:text-background"
                  >
                    {tpl.title} <span className="text-muted">by {tpl.artistName}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick wins row */}
            <div className="flex flex-col border-2 border-foreground bg-surface p-6 md:col-span-2 lg:col-span-1">
              <div className="flex-1">
                <h3 className="text-lg font-semibold">Try with Demo Track</h3>
                <p className="mt-2 text-sm text-muted">
                  Test the full analysis pipeline instantly with a sample track. No setup needed.
                </p>
              </div>
              <Link
                href="/analyze"
                className="btn-primary mt-5 w-full justify-center text-sm"
              >
                Open Quick Analyze
              </Link>
            </div>

            <div className="flex flex-col border-2 border-foreground bg-surface p-6 md:col-span-2 lg:col-span-1">
              <div className="flex-1">
                <h3 className="text-lg font-semibold">Import from Musixmatch</h3>
                <p className="mt-2 text-sm text-muted">
                  Search the catalog and pull in real lyrics, metadata and analysis in seconds.
                </p>
              </div>
              <Link
                href="/analyze"
                className="btn-secondary mt-5 w-full justify-center text-sm"
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
            <div className="mt-8 border-2 border-dashed border-foreground p-8 text-center">
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
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Quick Analyze Promo (always visible, clean card) */}
      <div className="mt-10 border-2 border-foreground bg-surface p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold text-foreground">Quick Analyze</h3>
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