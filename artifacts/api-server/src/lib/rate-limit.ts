import type { Request } from "express";

const WINDOW_MS = 24 * 60 * 60 * 1000;

export interface RateLimitStatus {
  limit: number;
  used: number;
  remaining: number;
  windowMs: number;
  resetAt: number | null;
  retryAfterMs: number | null;
}

const store = new Map<string, number[]>();

function prune(hits: number[], now: number): number[] {
  return hits.filter((t) => now - t < WINDOW_MS);
}

export function clientKey(req: Request): string {
  // `trust proxy` is enabled on the app, so req.ip reflects the forwarded client IP.
  // We deliberately rely on Express's parsed value rather than the raw, fully
  // client-controllable X-Forwarded-For header.
  return (req.ip || req.socket?.remoteAddress || "unknown").toLowerCase();
}

function describe(key: string, limit: number, now: number): RateLimitStatus {
  const hits = prune(store.get(key) ?? [], now);
  store.set(key, hits);
  const used = hits.length;
  const remaining = Math.max(0, limit - used);
  let resetAt: number | null = null;
  let retryAfterMs: number | null = null;
  if (remaining <= 0 && hits.length > 0) {
    const oldest = Math.min(...hits);
    resetAt = oldest + WINDOW_MS;
    retryAfterMs = Math.max(0, resetAt - now);
  }
  return { limit, used, remaining, windowMs: WINDOW_MS, resetAt, retryAfterMs };
}

/** Read current quota for a key without consuming a slot. */
export function peekRateLimit(key: string, limit: number, now = Date.now()): RateLimitStatus {
  return describe(key, limit, now);
}

export interface RateLimitReservation {
  allowed: boolean;
  status: RateLimitStatus;
  /** Token identifying the reserved slot — pass to releaseReservation to roll back. */
  token: number | null;
}

/**
 * Atomically check and reserve a slot in one synchronous step (JS is single-threaded,
 * so no two requests can interleave between the check and the push). Reserve BEFORE the
 * external generation call, then releaseReservation() if it fails so failures don't burn quota.
 */
export function tryConsume(key: string, limit: number, now = Date.now()): RateLimitReservation {
  const hits = prune(store.get(key) ?? [], now);
  if (hits.length >= limit) {
    store.set(key, hits);
    return { allowed: false, status: describe(key, limit, now), token: null };
  }
  hits.push(now);
  store.set(key, hits);
  return { allowed: true, status: describe(key, limit, now), token: now };
}

/** Roll back a previously reserved slot (e.g. when generation fails). */
export function releaseReservation(key: string, token: number | null): void {
  if (token == null) return;
  const hits = store.get(key);
  if (!hits) return;
  const idx = hits.indexOf(token);
  if (idx >= 0) {
    hits.splice(idx, 1);
    store.set(key, hits);
  }
}
