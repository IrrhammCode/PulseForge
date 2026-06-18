export interface N8nWorkflowPayload {
  event: string;
  projectId: string;
  projectTitle: string;
  artistName: string;
  genre: string;
  mood: string;
  versionLabel?: string;
  hitScore?: number;
  targetReleaseDate?: string;
  whatIf?: Record<string, unknown>;
  partners?: string[];
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