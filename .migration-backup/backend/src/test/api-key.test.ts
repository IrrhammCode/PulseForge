import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../db/client.js";

const app = createApp();
const BOOTSTRAP = "test-bootstrap-token";
const API_SECRET = "test-api-secret";

async function resetDb() {
  await prisma.audioBlob.deleteMany();
  await prisma.project.deleteMany();
  await prisma.syncSession.deleteMany();
}

describe("API key middleware", () => {
  const originalSecret = process.env.PULSEFORGE_API_SECRET;

  beforeEach(async () => {
    await resetDb();
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.PULSEFORGE_API_SECRET;
    } else {
      process.env.PULSEFORGE_API_SECRET = originalSecret;
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("allows /api routes when PULSEFORGE_API_SECRET is unset", async () => {
    delete process.env.PULSEFORGE_API_SECRET;

    const res = await request(app).get("/api/capabilities");
    expect(res.status).toBe(200);
  });

  it("requires X-PulseForge-Key on /api routes when secret is set", async () => {
    process.env.PULSEFORGE_API_SECRET = API_SECRET;

    const denied = await request(app).get("/api/capabilities");
    expect(denied.status).toBe(401);
    expect(denied.body.error).toBe("Unauthorized");

    const allowed = await request(app)
      .get("/api/capabilities")
      .set("X-PulseForge-Key", API_SECRET);
    expect(allowed.status).toBe(200);
  });

  it("exempts /api/cloud/* from API key (bearer auth only)", async () => {
    process.env.PULSEFORGE_API_SECRET = API_SECRET;

    const created = await request(app)
      .post("/api/cloud/auth/session")
      .send({ label: "Device" });
    expect(created.status).toBe(201);

    const projects = await request(app)
      .get("/api/cloud/projects")
      .set("Authorization", `Bearer ${created.body.token}`);
    expect(projects.status).toBe(200);
  });

  it("exempts POST /api/cloud/auth/session without API key", async () => {
    process.env.PULSEFORGE_API_SECRET = API_SECRET;

    const res = await request(app)
      .post("/api/cloud/auth/session")
      .send({ label: "Public create" });
    expect(res.status).toBe(201);
    expect(res.body.session.label).toBe("Public create");
  });
});

describe("session revoke", () => {
  beforeEach(async () => {
    await resetDb();
    delete process.env.PULSEFORGE_API_SECRET;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("DELETE /api/cloud/auth/session revokes the current bearer session", async () => {
    const created = await request(app)
      .post("/api/cloud/auth/session")
      .send({ label: "Revoke me" });
    const token = created.body.token as string;

    const revoked = await request(app)
      .delete("/api/cloud/auth/session")
      .set("Authorization", `Bearer ${token}`);
    expect(revoked.status).toBe(200);
    expect(revoked.body).toMatchObject({ ok: true, revoked: true });

    const me = await request(app)
      .get("/api/cloud/auth/me")
      .set("Authorization", `Bearer ${token}`);
    expect(me.status).toBe(401);
  });

  it("DELETE /api/cloud/auth/session rejects bootstrap token", async () => {
    const res = await request(app)
      .delete("/api/cloud/auth/session")
      .set("Authorization", `Bearer ${BOOTSTRAP}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Bootstrap");
  });
});