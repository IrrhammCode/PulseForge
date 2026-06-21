---
name: Missing ported API routes
description: Diagnostic heuristic for "AI/partner feature produces nothing" in the Next→Vite port.
---

# AI/partner feature "produces nothing"

The Next→Vite port left several `api-client.ts` functions pointing at backend
routes that were never implemented in `artifacts/api-server/src/routes/api.ts`.

**Heuristic:** when an AI or partner feature "produces nothing" or silently
fails, suspect a **missing backend route (404) first**, not a frontend bug.
Grep `api-client.ts` for the `fetch("/api/...")` path the feature uses, then
grep `api.ts` for that path — if there's no `apiRouter.post/get` for it, the
route was never ported. Add it.

**How to add a Groq-backed AI route:** mirror the pattern in
`lib/shared/src/lib/studio/generate-project.ts` — OpenAI-compatible chat
completions at `https://api.groq.com/openai/v1/chat/completions`, `GROQ_API_KEY`,
model from `GROQ_MODEL` (default `llama-3.3-70b-versatile`), `response_format`
json_object, an AbortController timeout, then normalize the JSON into the exact
shape the calling component consumes (match its field/section keys precisely).
Map missing-provider errors to HTTP 503 so the UI can show an actionable message.
