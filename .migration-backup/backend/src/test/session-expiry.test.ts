import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../db/client.js";
import { SESSION_IDLE_MAX_MS } from "../db/sessions.js";

const app = createApp();

async function resetDb() {
  await prisma.audioBlob.deleteMany();
  await prisma.project.deleteMany();
  await prisma.syncSession.deleteMany();
}

describe("session idle expiry", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("rejects sessions idle longer than 30 days", async () => {
    const created = await request(app)
      .post("/api/cloud/auth/session")
      .send({ label: "Stale" });
    const token = created.body.token as string;
    const sessionId = created.body.session.id as string;

    const stale = new Date(Date.now() - SESSION_IDLE_MAX_MS - 60_000);
    await prisma.syncSession.update({
      where: { id: sessionId },
      data: { lastUsed: stale },
    });

    const me = await request(app)
      .get("/api/cloud/auth/me")
      .set("Authorization", `Bearer ${token}`);
    expect(me.status).toBe(401);
  });
});