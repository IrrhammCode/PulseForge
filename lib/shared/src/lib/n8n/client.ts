export interface N8nWorkflowPayload {
  event: string;
  projectId: string;
  projectTitle: string;
  artistName: string;
  genre: string;
  mood: string;
  versionLabel?: string;
  hitScore?: number;
  hookStrength?: number;
  targetReleaseDate?: string;
  whatIf?: Record<string, unknown>;
  partners?: string[];
  /** Songstats velocity 0–100 when available */
  songstatsVelocity?: number;
  /** Cyanite energy source label */
  cyaniteStatus?: string;
  /** Top viral gaps for automation routing */
  gaps?: Array<{ id: string; title: string; severity: string; studioTab?: string }>;
  /** Per-platform stream highlights from Songstats */
  platformHighlights?: Record<string, string>;
  /** Nearby JamBase show count when fetched */
  nearbyShows?: number;
  timestamp: string;
}

function getWebhookUrl(): string | undefined {
  return process.env.N8N_WEBHOOK_URL;
}

export function hasN8nWebhook(): boolean {
  return Boolean(getWebhookUrl());
}

export async function triggerWorkflow(payload: N8nWorkflowPayload): Promise<{
  ok: boolean;
  status: number;
}> {
  const url = getWebhookUrl();
  if (!url) {
    throw new Error("N8N_WEBHOOK_URL is not configured");
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return { ok: res.ok, status: res.status };
}
