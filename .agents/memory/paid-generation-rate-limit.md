---
name: Paid generation rate limiting
description: How/why PulseForge throttles ElevenLabs music generation, and the accepted tradeoffs
---

# Music generation rate limit

Full-song generation (`POST /api/studio/music`, ElevenLabs Music — a paid call) is
throttled to a small number per rolling 24h window, keyed per client.

**Design:**
- Limiter lives in `api-server/src/lib/rate-limit.ts` (sliding window over an in-memory `Map`).
- Reserve-before-generate + rollback-on-failure: the route calls `tryConsume` (atomic
  check+reserve, safe because JS is single-threaded) *before* the ElevenLabs call, and
  `releaseReservation` on any failure (missing key, bad input, generation error) so only
  successful generations burn quota and concurrent requests can't overrun.
- Client identity = `req.ip` (with `app.set("trust proxy", true)` in `app.ts`), NOT the raw
  `X-Forwarded-For` header.
- A `GET /api/studio/music/quota` peek endpoint feeds the UI ("N of M left", reset countdown,
  disabled button + notification banner) without consuming a slot.

**Why these tradeoffs are acceptable (do not "fix" without a real requirement):**
This is a local-first, effectively single-user studio app. The limit's main job is protecting
the shared ElevenLabs key from accidental overuse and giving the user clear feedback — not
hardened multi-tenant abuse control. Therefore the known limitations are intentional:
in-memory state resets on server restart and is per-instance (not distributed), and `req.ip`
is still spoofable by a determined non-browser client. Only move to persistent/shared storage
(e.g. Redis) or stronger identity if the app becomes genuinely multi-user/public.
