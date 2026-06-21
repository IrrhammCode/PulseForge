const LALAL_BASE = "https://www.lalal.ai/api/v1";

const STEM_LIST = ["vocals", "drum", "bass", "electric_guitar"] as const;

const LABEL_TO_STEM: Record<string, "vocals" | "drums" | "bass" | "other"> = {
  vocals: "vocals",
  drum: "drums",
  drums: "drums",
  bass: "bass",
  electric_guitar: "other",
  piano: "other",
  acoustic_guitar: "other",
};

function getLicenseKey(): string | undefined {
  return process.env.LALAL_API_KEY;
}

export function hasLalalKey(): boolean {
  return Boolean(getLicenseKey());
}

interface UploadResponse {
  id: string;
  name: string;
  duration: number;
}

interface TaskResponse {
  id: string;
}

interface CheckTrack {
  label: string;
  type: string;
  url: string;
}

interface CheckResult {
  status: string;
  progress?: number;
  task_type?: string;
  split?: {
    stem_track?: CheckTrack;
    back_track?: CheckTrack;
  };
  result?: {
    tracks?: CheckTrack[];
  };
}

function authHeaders(fileName?: string): HeadersInit {
  const key = getLicenseKey();
  if (!key) throw new Error("LALAL_API_KEY is not configured");
  const headers: HeadersInit = { "X-License-Key": key };
  if (fileName) {
    headers["Content-Disposition"] = `attachment; filename=${fileName}`;
  }
  return headers;
}

export async function uploadSource(buffer: ArrayBuffer, fileName: string): Promise<UploadResponse> {
  const res = await fetch(`${LALAL_BASE}/upload/`, {
    method: "POST",
    headers: authHeaders(fileName),
    body: buffer,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { detail?: string }).detail ?? `LALAL.AI upload failed (${res.status})`
    );
  }

  return res.json() as Promise<UploadResponse>;
}

export async function startMultistem(sourceId: string): Promise<string> {
  const res = await fetch(`${LALAL_BASE}/split/multistem/`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      split_input: {
        source_id: sourceId,
        stem_list: [...STEM_LIST],
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { detail?: string }).detail ?? `LALAL.AI split failed (${res.status})`
    );
  }

  const data = (await res.json()) as TaskResponse;
  return data.id;
}

export async function checkTask(taskId: string): Promise<CheckResult> {
  const res = await fetch(`${LALAL_BASE}/check/`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ task_ids: [taskId] }),
  });

  if (!res.ok) {
    throw new Error(`LALAL.AI check failed (${res.status})`);
  }

  const data = (await res.json()) as { result?: Record<string, CheckResult> };
  const result = data.result?.[taskId];
  if (!result) throw new Error("LALAL.AI task not found");
  return result;
}

export async function pollTask(
  taskId: string,
  maxAttempts = 40,
  intervalMs = 3000
): Promise<CheckTrack[]> {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await checkTask(taskId);
    if (result.status === "success") {
      const tracks = result.result?.tracks ?? [];
      if (tracks.length > 0) return tracks;
      if (result.split?.stem_track) {
        return [result.split.stem_track, ...(result.split.back_track ? [result.split.back_track] : [])];
      }
      throw new Error("LALAL.AI completed without tracks");
    }
    if (result.status === "error" || result.status === "cancelled") {
      throw new Error(`LALAL.AI task ${result.status}`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("LALAL.AI stem separation timed out");
}

export async function downloadTrack(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download LALAL.AI stem (${res.status})`);
  return res.arrayBuffer();
}

export type LalalStemBlobs = Partial<Record<"vocals" | "drums" | "bass" | "other", ArrayBuffer>>;

export async function separateWithLalal(
  buffer: ArrayBuffer,
  fileName: string
): Promise<LalalStemBlobs> {
  const upload = await uploadSource(buffer, fileName);
  const taskId = await startMultistem(upload.id);
  const tracks = await pollTask(taskId);

  const blobs: LalalStemBlobs = {};
  for (const track of tracks) {
    if (track.type !== "stem") continue;
    const stemId = LABEL_TO_STEM[track.label] ?? LABEL_TO_STEM[track.label.split("@")[0] ?? ""];
    if (!stemId || blobs[stemId]) continue;
    blobs[stemId] = await downloadTrack(track.url);
  }

  return blobs;
}