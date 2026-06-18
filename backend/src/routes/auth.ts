import { Router } from "express";
import { createSyncSession, getSessionById, revokeSessionById } from "../db/sessions";
import { requireSyncAuth } from "../middleware/auth";

export const authRouter = Router();

/** Create a new sync session — returns a bearer token (store client-side). */
authRouter.post("/session", async (req, res) => {
  const body = req.body as { label?: string; email?: string };
  const { session, token } = await createSyncSession({
    label: body.label,
    email: body.email,
  });

  res.status(201).json({
    ok: true,
    token,
    session: {
      id: session.id,
      label: session.label,
      email: session.email,
      createdAt: session.createdAt.toISOString(),
    },
  });
});

/** Revoke the current session (bearer token only; bootstrap cannot revoke). */
authRouter.delete("/session", requireSyncAuth, async (req, res) => {
  if (req.syncAuth?.kind === "bootstrap") {
    res.status(400).json({ error: "Bootstrap token cannot revoke a session" });
    return;
  }

  const sessionId = req.syncAuth?.sessionId;
  if (!sessionId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const revoked = await revokeSessionById(sessionId);
  if (!revoked) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.json({ ok: true, revoked: true });
});

/** Validate token and return session metadata. */
authRouter.get("/me", requireSyncAuth, async (req, res) => {
  if (req.syncAuth?.kind === "bootstrap") {
    res.json({
      kind: "bootstrap",
      label: req.syncAuth.label,
    });
    return;
  }

  const session = req.syncAuth?.sessionId
    ? await getSessionById(req.syncAuth.sessionId)
    : null;

  if (!session) {
    res.status(401).json({ error: "Session not found" });
    return;
  }

  res.json({
    kind: "session",
    session: {
      id: session.id,
      label: session.label,
      email: session.email,
      createdAt: session.createdAt.toISOString(),
      lastUsed: session.lastUsed.toISOString(),
    },
  });
});