---
name: Viral Lab proxy payload bloat
description: Why large frontend POST bodies (allProjects with audio) stall through the Replit proxy even when the backend is fast.
---

# Viral Lab "1M simulation never finishes"

The Viral Lab run hit `/api/viral/analyze` and spun forever, while the backend
itself responded in ~1-4s (confirmed via curl to localhost:8080). The hang was
the **browser request**, not the server.

Cause: the frontend sent `allProjects` — every studio project — and each
project's versions carry heavy `audio` (waveform `number[]` + stems). With
several projects this is a multi-MB JSON POST that stalls through the platform
proxy. Direct curl to localhost works because it bypasses the proxy.

**Rule:** before POSTing collections of studio projects to the backend, strip
heavy per-version blobs (`audio` waveform/stems) from anything the endpoint
doesn't actually consume. `buildReleaseHistory` (the only consumer of
`allProjects`) reads just title/artist + version scores/labels/timestamps —
never audio. Keep the *selected* project full; slim the rest.

**Why:** localhost curl ≠ browser path. A fix that "works in curl" can still
hang in the browser purely due to request body size through the proxy.

**How to apply:** for any new frontend→backend call that forwards whole
StudioProject objects (especially arrays of them), send only the fields the
route reads. Also wrap long-running analysis fetches in an AbortController
timeout so the UI can never hang indefinitely.
