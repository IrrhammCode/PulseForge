import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  GitCompare,
  HelpCircle,
  LayoutDashboard,
  LayoutGrid,
  Music2,
  PenLine,
  Rocket,
  Flame,
  Plug,
  Search,
  Settings,
  SlidersHorizontal,
} from "lucide-react";
import { STUDIO_TABS } from "@/types/studio";

export interface NavItem {
  href: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  match?: (pathname: string) => boolean;
}

export interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}

export const MAIN_NAV: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "Overview & pipeline",
    icon: LayoutDashboard,
    match: (p) => p === "/dashboard",
  },
  {
    href: "/studio",
    label: "Projects",
    description: "All your music projects",
    icon: LayoutGrid,
    match: (p) => p === "/studio" || p.startsWith("/studio/"),
  },
  {
    href: "/analyze",
    label: "Quick Analyze",
    description: "Musixmatch track intel",
    icon: Search,
    match: (p) => p.startsWith("/analyze"),
  },
  {
    href: "/viral",
    label: "Viral Lab",
    description: "1M crowd sim & gap analysis",
    icon: Flame,
    match: (p) => p.startsWith("/viral"),
  },
  {
    href: "/integrations",
    label: "Integrations",
    description: "Partner APIs & live status",
    icon: Plug,
    match: (p) => p.startsWith("/integrations"),
  },
];



export const SYSTEM_NAV: NavItem[] = [
  {
    href: "/settings",
    label: "Settings",
    description: "Local preferences",
    icon: Settings,
    match: (p) => p.startsWith("/settings"),
  },
  {
    href: "/help",
    label: "Help",
    description: "Documentation & support",
    icon: HelpCircle,
    match: (p) => p.startsWith("/help"),
  },
];

export const NAV_SECTIONS: NavSection[] = [
  { id: "main", label: "MAIN", items: MAIN_NAV },
  { id: "system", label: "SYSTEM", items: SYSTEM_NAV },
];

const STUDIO_TAB_ICONS: Record<string, LucideIcon> = {
  write: PenLine,
  produce: Music2,
  analyze: BarChart3,
  compare: GitCompare,
  launch: Rocket,
};

export function getProjectNav(projectId: string): NavItem[] {
  return STUDIO_TABS.map((tab) => ({
    href: `/studio/${projectId}/${tab.id}`,
    label: tab.label,
    description: tab.description,
    icon: STUDIO_TAB_ICONS[tab.id] ?? SlidersHorizontal,
    match: (p) =>
      p === `/studio/${projectId}/${tab.id}` ||
      p.startsWith(`/studio/${projectId}/${tab.id}/`),
  }));
}

export { extractProjectId, getViralLabLink } from "@pulseforge/shared/lib/routes";

export function isNavActive(item: NavItem, pathname: string): boolean {
  if (item.match) return item.match(pathname);
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}