import type { Request, Response, NextFunction } from "express";

const API_SECRET_ENV = "PULSEFORGE_API_SECRET";
const API_KEY_HEADER = "x-pulseforge-key";

function apiSecret(): string | undefined {
  const value = process.env[API_SECRET_ENV]?.trim();
  return value || undefined;
}

/** Paths under /api that skip the optional API secret (cloud uses bearer auth). */
function isExemptApiPath(path: string): boolean {
  return path === "/cloud" || path.startsWith("/cloud/");
}

export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const secret = apiSecret();
  if (!secret) {
    next();
    return;
  }

  if (isExemptApiPath(req.path)) {
    next();
    return;
  }

  const provided = req.headers[API_KEY_HEADER];
  const key = Array.isArray(provided) ? provided[0] : provided;

  if (!key || key !== secret) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}