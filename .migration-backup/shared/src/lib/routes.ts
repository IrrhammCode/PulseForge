export function extractProjectId(pathname: string): string | null {
  const match = pathname.match(/^\/studio\/([^/]+)/);
  if (!match?.[1] || match[1] === "studio") return null;
  return match[1];
}

export function getViralLabLink(projectId?: string): string {
  if (!projectId) return "/viral";
  return `/viral?project=${encodeURIComponent(projectId)}`;
}