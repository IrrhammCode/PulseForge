import type { Request, Response, NextFunction } from "express";
import { findSessionByToken } from "../db/sessions";

const TOKEN_ENV = "PULSEFORGE_SYNC_TOKEN";

export type SyncAuthKind = "bootstrap" | "session";

export interface SyncAuthContext {
  kind: SyncAuthKind;
  sessionId?: string;
  label?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      syncAuth?: SyncAuthContext;
    }
  }
}

function bootstrapToken(): string | undefined {
  return process.env[TOKEN_ENV];
}

export function isBootstrapToken(token: string): boolean {
  const envToken = bootstrapToken();
  return Boolean(envToken && token === envToken);
}

export async function resolveSyncAuth(
  authHeader: string | undefined
): Promise<SyncAuthContext | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;

  if (isBootstrapToken(token)) {
    return { kind: "bootstrap", label: "bootstrap-admin" };
  }

  const session = await findSessionByToken(token);
  if (!session) return null;

  return {
    kind: "session",
    sessionId: session.id,
    label: session.label ?? session.email ?? session.id,
  };
}

export async function requireSyncAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const auth = await resolveSyncAuth(req.headers.authorization);
  if (!auth) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.syncAuth = auth;
  next();
}

/** Optional auth for public session creation. */
export function isAuthorizedSyncRequest(authHeader: string | undefined): boolean {
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);
  return isBootstrapToken(token);
}