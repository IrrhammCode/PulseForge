---
name: Missing ported API routes
description: Frontend api-client calls that the Next→Vite port never implemented on the Express backend.
---

# Frontend calls without backend routes

The Next→Vite port left several `api-client.ts` functions pointing at backend
routes that were never implemented in `artifacts/api-server/src/routes/api.ts`.
When an AI/partner feature "produces nothing" or silently fails, **check api.ts
for a missing route first** — the symptom is a 404, not a code bug.

Implemented so far:
- `POST /api/studio/generate` — AI project generation (Groq-backed via
  `lib/shared/src/lib/studio/generate-project.ts`).

Still missing (frontend calls them; they 404 / fall back to friendly errors):
- `POST /api/catalog/similar`
- `POST /api/studio/whisper-align`
- `POST /api/catalog/video-sync`
- `POST /api/studio/translate-lyrics`

**How to apply:** to add a Groq-backed AI route, mirror the pattern in
`generate-project.ts`: OpenAI-compatible chat completions at
`https://api.groq.com/openai/v1/chat/completions`, `GROQ_API_KEY`, model from
`GROQ_MODEL` (default `llama-3.3-70b-versatile`), `response_format` json_object,
an AbortController timeout, then normalize the JSON into the exact shape the
calling component consumes. Map missing-provider errors to 503.
