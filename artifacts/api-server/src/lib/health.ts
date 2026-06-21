import { getSystemCapabilities } from "@pulseforge/shared/lib/partners/capabilities";
import { prisma } from "../db/client";

export async function getHealthStatus() {
  let db: "ok" | "error" = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = "error";
  }

  const partners = getSystemCapabilities().partners;
  const configured = (Object.entries(partners) as [string, boolean][])
    .filter(([, enabled]) => enabled)
    .map(([name]) => name);

  return {
    ok: db === "ok",
    service: "pulseforge-backend",
    db,
    partners: { configured },
  };
}