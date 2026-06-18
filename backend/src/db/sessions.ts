import { prisma } from "./client";
import { generateSyncToken, hashToken } from "../auth/crypto";

/** Sessions idle longer than this are treated as expired. */
export const SESSION_IDLE_MAX_MS = 30 * 24 * 60 * 60 * 1000;

export interface SyncSessionRecord {
  id: string;
  label: string | null;
  email: string | null;
  createdAt: Date;
  lastUsed: Date;
}

export async function createSyncSession(input?: {
  label?: string;
  email?: string;
}): Promise<{ session: SyncSessionRecord; token: string }> {
  const token = generateSyncToken();
  const tokenHash = hashToken(token);

  const session = await prisma.syncSession.create({
    data: {
      label: input?.label?.trim() || null,
      email: input?.email?.trim() || null,
      tokenHash,
    },
  });

  return {
    token,
    session: {
      id: session.id,
      label: session.label,
      email: session.email,
      createdAt: session.createdAt,
      lastUsed: session.lastUsed,
    },
  };
}

export async function findSessionByToken(
  token: string
): Promise<SyncSessionRecord | null> {
  const row = await prisma.syncSession.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!row) return null;

  const idleMs = Date.now() - row.lastUsed.getTime();
  if (idleMs > SESSION_IDLE_MAX_MS) {
    await prisma.syncSession.delete({ where: { id: row.id } }).catch(() => undefined);
    return null;
  }

  await prisma.syncSession.update({
    where: { id: row.id },
    data: { lastUsed: new Date() },
  });

  return {
    id: row.id,
    label: row.label,
    email: row.email,
    createdAt: row.createdAt,
    lastUsed: new Date(),
  };
}

export async function revokeSessionById(id: string): Promise<boolean> {
  const result = await prisma.syncSession.deleteMany({ where: { id } });
  return result.count > 0;
}

export async function getSessionById(id: string): Promise<SyncSessionRecord | null> {
  const row = await prisma.syncSession.findUnique({ where: { id } });
  if (!row) return null;
  return {
    id: row.id,
    label: row.label,
    email: row.email,
    createdAt: row.createdAt,
    lastUsed: row.lastUsed,
  };
}