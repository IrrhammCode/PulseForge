
export type ActivityType =
  | "analyze_complete"
  | "viral_run"
  | "project_created"
  | "track_imported"
  | "project_updated";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  subtitle?: string;
  score?: number;
  link?: string;
  at: string; // ISO
}

const STORAGE_KEY = "pulseforge_activity_log";
const MAX_ITEMS = 12;

function readAll(): ActivityItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ActivityItem[]) : [];
  } catch {
    return [];
  }
}

function writeAll(items: ActivityItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    // ignore
  }
}

export function logActivity(
  type: ActivityType,
  payload: { title: string; subtitle?: string; score?: number; link?: string }
): ActivityItem {
  const item: ActivityItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    title: payload.title,
    subtitle: payload.subtitle,
    score: payload.score,
    link: payload.link,
    at: new Date().toISOString(),
  };

  const current = readAll();
  // avoid immediate duplicates for same title+type within 2s
  const filtered = current.filter(
    (c) => !(c.type === type && c.title === payload.title && Date.now() - new Date(c.at).getTime() < 2000)
  );
  const next = [item, ...filtered].slice(0, MAX_ITEMS);
  writeAll(next);
  return item;
}

export function getRecentActivities(limit = 6): ActivityItem[] {
  return readAll().slice(0, limit);
}

export function clearActivityLog() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}
