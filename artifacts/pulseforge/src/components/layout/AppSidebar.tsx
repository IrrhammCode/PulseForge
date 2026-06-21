
import { Link } from "wouter";
import { usePathname } from "@/lib/navigation-compat";
import React, { useState } from "react";
import { PulseForgeLogo } from "@/components/icons/BrandLogos";
import {
  extractProjectId,
  getViralLabLink,
  isNavActive,
  MAIN_NAV,
  SYSTEM_NAV,
  type NavItem,
} from "@/lib/navigation";

import { useStudioProject } from "@/lib/hooks/useStudioProject";
import { useStudioProjects } from "@/lib/hooks/useStudioProjects";
import { cn } from "@/lib/utils";
import { Flame, FolderOpen, LayoutGrid, Search, X, ChevronRight, Sparkles, Music2 } from "lucide-react";

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
}

function NavLink({
  item,
  pathname,
  onNavigate,
  nested,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
  nested?: boolean;
}) {
  const active = isNavActive(item, pathname);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "group relative flex items-start gap-3 rounded-xl px-3 py-2.5 transition-all duration-200",
        nested ? "pl-4" : "",
        active
          ? "bg-accent/10 text-accent-light shadow-[inset_0_0_0_1px_rgba(139,92,246,0.15)]"
          : "text-muted hover:bg-surface-elevated hover:text-foreground"
      )}
    >
      {/* Active indicator bar */}
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
      )}
      <Icon
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0 transition-colors duration-200",
          active ? "text-accent-light" : "text-muted group-hover:text-foreground"
        )}
      />
      <div className="min-w-0">
        <p className="text-sm font-medium leading-none">{item.label}</p>
        {item.description && (
          <p className="mt-1 truncate text-[11px] text-muted">{item.description}</p>
        )}
      </div>
      {/* Hover arrow */}
      {!active && (
        <ChevronRight className="ml-auto mt-0.5 h-3 w-3 shrink-0 text-muted/0 transition-all duration-200 group-hover:text-muted/60 group-hover:translate-x-0.5" />
      )}
    </Link>
  );
}

function WorkspaceSection({
  projectId,
  pathname,
  onNavigate,
}: {
  projectId: string;
  pathname: string;
  onNavigate?: () => void;
}) {
  const { project } = useStudioProject(projectId);

  const workspaceItems: NavItem[] = [
    {
      href: `/studio/${projectId}`,
      label: project?.title || "Overview",
      description: "Current project home",
      icon: LayoutGrid,
      match: (p) => p === `/studio/${projectId}` || p === `/studio/${projectId}/`,
    },
    {
      href: `/studio/${projectId}/compare`,
      label: "Versions",
      description: "Version history & compare",
      icon: LayoutGrid,
      match: (p) => p.startsWith(`/studio/${projectId}/compare`),
    },
    {
      href: `/studio/${projectId}/analyze`,
      label: "Activity",
      description: "Analysis & timeline history",
      icon: LayoutGrid,
      match: (p) => p.startsWith(`/studio/${projectId}/analyze`),
    },
    {
      href: `/studio/${projectId}/launch`,
      label: "Share / Export",
      description: "Release pack & launch",
      icon: LayoutGrid,
      match: (p) => p.startsWith(`/studio/${projectId}/launch`),
    },
    {
      href: getViralLabLink(projectId),
      label: "Viral Lab",
      description: "1M sim for this project",
      icon: Flame,
      match: (p) => p.startsWith("/viral"),
    },
  ];

  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-accent-light">
        <FolderOpen className="h-3 w-3" />
        WORKSPACE
      </p>
      {project && (
        <div className="mx-3 mb-2 flex items-center gap-2 rounded-lg bg-accent/5 px-2.5 py-1.5">
          <Music2 className="h-3.5 w-3.5 text-accent-light" />
          <p className="truncate text-xs font-medium text-foreground">
            {project.title}
          </p>
        </div>
      )}
      <div className="space-y-0.5">
        {workspaceItems.map((item) => (
          <NavLink
            key={`${item.href}-${item.label}`}
            item={item}
            pathname={pathname}
            onNavigate={onNavigate}
            nested
          />
        ))}
      </div>
    </div>
  );
}

function GlobalSearchResults({
  query,
  pathname,
  onNavigate,
}: {
  query: string;
  pathname: string;
  onNavigate?: () => void;
}) {
  const { projects } = useStudioProjects();
  const q = query.toLowerCase().trim();

  const matchingProjects = projects
    .filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.artistName.toLowerCase().includes(q)
    )
    .slice(0, 4);

  const quickLinks = [
    { href: "/analyze", label: "Quick Analyze", desc: "Search & score a track" },
    { href: "/viral", label: "Viral Lab", desc: "Run 1M simulation" },
    { href: "/studio", label: "All Projects", desc: "Browse studio" },
  ].filter((l) => l.label.toLowerCase().includes(q) || l.desc.toLowerCase().includes(q) || !q);

  return (
    <div className="space-y-3">
      {matchingProjects.length > 0 && (
        <div>
          <div className="px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-accent-light">Projects</div>
          <div className="space-y-0.5">
            {matchingProjects.map((p) => (
              <Link
                key={p.id}
                href={`/studio/${p.id}`}
                onClick={onNavigate}
                className={cn(
                  "flex items-center justify-between rounded-lg px-2.5 py-2 transition-all duration-200 hover:bg-surface",
                  pathname.startsWith(`/studio/${p.id}`) && "bg-accent/10 text-accent-light"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Music2 className="h-3.5 w-3.5 shrink-0 text-accent-light/60" />
                  <span className="truncate text-sm">{p.title}</span>
                </div>
                <span className="ml-2 shrink-0 text-[10px] text-muted">{p.artistName}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">Quick actions</div>
        <div className="space-y-0.5">
          {quickLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={onNavigate}
              className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-all duration-200 hover:bg-surface"
            >
              <Sparkles className="h-3 w-3 shrink-0 text-accent-light/40" />
              <span>{l.label}</span>
              <span className="text-muted">— {l.desc}</span>
            </Link>
          ))}
        </div>
        {matchingProjects.length === 0 && quickLinks.length === 0 && (
          <div className="px-1 py-2 text-sm text-muted">No matches. Try &quot;analyze&quot; or &quot;viral&quot;.</div>
        )}
      </div>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const projectId = extractProjectId(pathname);
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="flex h-full flex-col">
      {/* Brand header */}
      <div className="border-b border-border/50 px-4 py-5">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="group flex items-center gap-3 transition hover:opacity-90"
        >
          <div className="relative">
            <PulseForgeLogo size={34} />
            {/* Subtle glow behind logo */}
            <div className="absolute inset-0 -z-10 rounded-lg bg-accent/20 blur-md opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-bold tracking-tight">
              Pulse<span className="gradient-text-warm">Forge</span>
            </p>
            <p className="text-[10px] uppercase tracking-widest text-muted">Music Studio OS</p>
          </div>
        </Link>
      </div>

      {/* Search bar */}
      <div className="px-3 py-3 border-b border-border/40">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted transition-colors group-focus-within:text-accent-light" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search projects..."
            className="w-full rounded-xl border border-border/60 bg-surface/60 py-2 pl-9 pr-3 text-sm placeholder:text-muted/60 transition-all duration-200 focus:outline-none focus:border-accent/40 focus:bg-surface focus:ring-1 focus:ring-accent/20 focus:shadow-[0_0_12px_rgba(139,92,246,0.08)]"
            aria-label="Global search"
          />
        </div>

        {/* Search results dropdown */}
        {searchTerm && (
          <div className="mt-2 glass-card rounded-xl p-2.5 text-xs shadow-xl shadow-black/20">
            <GlobalSearchResults
              query={searchTerm}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4 scrollbar-thin">
        {/* MAIN */}
        <div>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted">
            MAIN
          </p>
          <div className="space-y-0.5">
            {MAIN_NAV.map((item) => (
              <NavLink
                key={`${item.href}-${item.label}`}
                item={item}
                pathname={pathname}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>

        {/* WORKSPACE — only when project active */}
        {projectId && (
          <WorkspaceSection
            projectId={projectId}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        )}

        {/* SYSTEM */}
        <div>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted">
            SYSTEM
          </p>
          <div className="space-y-0.5">
            {SYSTEM_NAV.map((item) => (
              <NavLink
                key={`${item.href}-${item.label}`}
                item={item}
                pathname={pathname}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      </nav>

      {/* Footer badge */}
      <div className="border-t border-border/40 px-4 py-4">
        <div className="flex items-center gap-2 rounded-xl bg-accent/5 border border-accent/10 px-3 py-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-accent/20 text-[10px]">✦</span>
          <div>
            <p className="text-[11px] font-semibold text-accent-light">Musicathon 2026</p>
            <p className="text-[10px] text-muted">Official entry</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppSidebar({ open, onClose }: AppSidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[240px] border-r border-border/40 bg-surface/80 backdrop-blur-2xl lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[280px] border-r border-border/40 bg-surface/95 backdrop-blur-2xl shadow-2xl shadow-black/40 transition-transform duration-300 ease-out lg:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-4 rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-elevated hover:text-foreground"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent onNavigate={onClose} />
      </aside>
    </>
  );
}