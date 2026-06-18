import { createHash, randomBytes } from "crypto";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateSyncToken(): string {
  return randomBytes(32).toString("base64url");
}