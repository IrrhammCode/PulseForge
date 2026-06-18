"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { Flame, LayoutGrid, Search, X } from "lucide-react";

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
        "group flex items-start gap-3 rounded-xl px-3 py-2.5 transition",
        nested ? "pl-4" : "",
        active
          ? "bg-accent-muted text-accent-light"
          : "text-muted hover:bg-surface-elevated hover:text-foreground"
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          active ? "text-accent-light" : "text-muted group-hover:text-foreground"
        )}
      />
      <div className="min-w-0">
        <p className="text-sm font-medium leading-none">{item.label}</p>
        {item.description && (
          <p className="mt-1 truncate text-[11px] text-muted">{item.description}</p>
        )}
      </div>
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

  // Workspace items per recommended structure
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
      <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted">
        WORKSPACE
      </p>
      {project && (
        <p className="mb-2 truncate px-3 text-xs font-medium text-foreground">
          {project.title}
        </p>
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
    <div className="space-y-2">
      {matchingProjects.length > 0 && (
        <div>
          <div className="px-1 pb-1 text-[10px] uppercase tracking-wider text-muted">Projects</div>
          {matchingProjects.map((p) => (
            <Link
              key={p.id}
              href={`/studio/${p.id}`}
              onClick={onNavigate}
              className={cn(
                "flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-surface",
                pathname.startsWith(`/studio/${p.id}`) && "bg-accent-muted text-accent-light"
              )}
            >
              <span className="truncate text-sm">{p.title}</span>
              <span className="ml-2 shrink-0 text-[10px] text-muted">{p.artistName}</span>
            </Link>
          ))}
        </div>
      )}

      <div>
        <div className="px-1 pb-1 text-[10px] uppercase tracking-wider text-muted">Quick actions</div>
        {quickLinks.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            onClick={onNavigate}
            className="block rounded-lg px-2 py-1 text-sm hover:bg-surface"
          >
            {l.label} <span className="text-muted">— {l.desc}</span>
          </Link>
        ))}
        {matchingProjects.length === 0 && quickLinks.length === 0 && (
          <div className="px-1 py-1 text-muted">No matches. Try &quot;analyze&quot; or &quot;viral&quot;.</div>
        )}
      </div>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const projectId = extractProjectId(pathname);

  // Global search: filters projects live + quick action links
  const [searchTerm, setSearchTerm] = useState("");

  // For demo, we show the input always. In future can filter nav items by searchTerm.

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-5">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-3 transition hover:opacity-90"
        >
          <PulseForgeLogo size={32} />
          <div className="min-w-0">
            <p className="truncate text-base font-bold tracking-tight">
              Pulse<span className="text-accent">Forge</span>
            </p>
            <p className="text-[10px] uppercase tracking-widest text-muted">Music Studio OS</p>
          </div>
        </Link>
      </div>

      {/* Global Search Bar (High priority) */}
      <div className="px-3 py-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search projects, tracks, analyses..."
            className="w-full rounded-xl border border-border bg-surface pl-9 py-2 text-sm placeholder:text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            aria-label="Global search"
          />
        </div>

        {/* Live search results (projects + quick links) */}
        {searchTerm && (
          <div className="mt-2 rounded-xl border border-border bg-surface-elevated p-2 text-xs">
            <GlobalSearchResults
              query={searchTerm}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
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

        {/* WORKSPACE - only when project active (High priority: Current Project access) */}
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

      <div className="border-t border-border px-4 py-4">
        <span className="inline-flex rounded-full border border-border bg-surface-elevated px-2.5 py-1 text-[10px] font-medium text-muted">
          Musicathon 2026
        </span>
      </div>
    </div>
  );
}

export function AppSidebar({ open, onClose }: AppSidebarProps) {
  return (
    <>
      {/* Desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[240px] border-r border-border bg-surface lg:block">
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

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[280px] border-r border-border bg-surface transition-transform duration-200 lg:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-4 rounded-lg p-1.5 text-muted hover:bg-surface-elevated hover:text-foreground"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent onNavigate={onClose} />
      </aside>
    </>
  );
}