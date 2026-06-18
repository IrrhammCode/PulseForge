import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../db/client.js";
import { mockProject } from "./fixtures.js";

const app = createApp();
const BOOTSTRAP = "test-bootstrap-token";

async function resetDb() {
  await prisma.audioBlob.deleteMany();
  await prisma.project.deleteMany();
  await prisma.syncSession.deleteMany();
}

describe("cloud API", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("GET /health returns ok with db and partners", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      service: "pulseforge-backend",
      db: "ok",
    });
    expect(res.body.partners).toHaveProperty("configured");
    expect(Array.isArray(res.body.partners.configured)).toBe(true);
  });

  it("GET /api/cloud/projects without auth returns 401", async () => {
    const res = await request(app).get("/api/cloud/projects");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Unauthorized");
  });

  it("POST /api/cloud/auth/session creates a bearer token", async () => {
    const res = await request(app)
      .post("/api/cloud/auth/session")
      .send({ label: "Test device" });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.session.label).toBe("Test device");
  });

  it("GET /api/cloud/auth/me validates bootstrap and session tokens", async () => {
    const bootstrap = await request(app)
      .get("/api/cloud/auth/me")
      .set("Authorization", `Bearer ${BOOTSTRAP}`);
    expect(bootstrap.status).toBe(200);
    expect(bootstrap.body.kind).toBe("bootstrap");

    const created = await request(app)
      .post("/api/cloud/auth/session")
      .send({ label: "Laptop" });
    const session = await request(app)
      .get("/api/cloud/auth/me")
      .set("Authorization", `Bearer ${created.body.token}`);
    expect(session.status).toBe(200);
    expect(session.body.kind).toBe("session");
    expect(session.body.session.label).toBe("Laptop");
  });

  it("session-scoped projects are isolated from other sessions", async () => {
    const a = await request(app)
      .post("/api/cloud/auth/session")
      .send({ label: "A" });
    const b = await request(app)
      .post("/api/cloud/auth/session")
      .send({ label: "B" });

    const project = mockProject("p1", "Session A", "2026-06-16T10:00:00.000Z");
    await request(app)
      .post("/api/cloud/projects")
      .set("Authorization", `Bearer ${a.body.token}`)
      .send({ mode: "upsert", project });

    const listA = await request(app)
      .get("/api/cloud/projects")
      .set("Authorization", `Bearer ${a.body.token}`);
    const listB = await request(app)
      .get("/api/cloud/projects")
      .set("Authorization", `Bearer ${b.body.token}`);

    expect(listA.body.projects).toHaveLength(1);
    expect(listB.body.projects).toHaveLength(0);
  });

  it("POST /api/cloud/conflicts detects merge conflicts", async () => {
    const local = mockProject("p1", "Local", "2026-06-16T10:00:00.000Z");
    const cloud = mockProject("p1", "Cloud", "2026-06-16T12:00:00.000Z");

    await request(app)
      .post("/api/cloud/projects")
      .set("Authorization", `Bearer ${BOOTSTRAP}`)
      .send({ mode: "upsert", project: cloud });

    const res = await request(app)
      .post("/api/cloud/conflicts")
      .set("Authorization", `Bearer ${BOOTSTRAP}`)
      .send({ localProjects: [local] });

    expect(res.status).toBe(200);
    expect(res.body.conflicts).toHaveLength(1);
    expect(res.body.conflicts[0].projectId).toBe("p1");
  });

  it("merge mode applies explicit conflict resolutions", async () => {
    const local = mockProject("p1", "Local copy", "2026-06-16T10:00:00.000Z");
    const cloud = mockProject("p1", "Cloud copy", "2026-06-16T12:00:00.000Z");

    const res = await request(app)
      .post("/api/cloud/projects")
      .set("Authorization", `Bearer ${BOOTSTRAP}`)
      .send({
        mode: "merge",
        projects: [cloud],
        localProjects: [local],
        resolutions: { p1: "local" },
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.keptLocal).toBe(1);

    const list = await request(app)
      .get("/api/cloud/projects")
      .set("Authorization", `Bearer ${BOOTSTRAP}`);
    expect(list.body.projects[0].title).toBe("Local copy");
  });
});