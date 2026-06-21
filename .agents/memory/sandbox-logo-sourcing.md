---
name: Sandbox logo / brand-asset sourcing
description: How to fetch real brand logos when the dev sandbox network is allowlisted and most CDNs fail to resolve.
---

# Sourcing real brand logos in the restricted sandbox

The dev sandbox (both `fetch` in code_execution and `curl` in bash) has an
**allowlisted egress**: most direct brand/logo CDNs fail DNS (`Could not resolve host`),
e.g. `logo.clearbit.com`. So you generally cannot verify/download an arbitrary
official CDN URL from here.

**What IS reachable and returns official marks:**
- `https://www.google.com/s2/favicons?domain=<domain>&sz=256` — site favicon PNG. Reliable but resolution is whatever the site ships (some tiny, e.g. musixmatch 29x28, n8n 48x48).
- `https://icons.duckduckgo.com/ip3/<domain>.ico` — same ballpark, often multi-res `.ico`.
- `https://unavatar.io/<domain>` and especially `https://unavatar.io/github/<org>` and `https://unavatar.io/twitter/<handle>` — these return the org/brand avatar at **400x400**, which is the cleanest source for a crisp logo (used github/n8n-io and twitter/musixmatch).
- `cdn.simpleicons.org` / jsdelivr `simple-icons` — reachable but only a few brands exist (elevenlabs, n8n) and they are **monochrome glyphs**, not full-color marks.

**Why:** the `<img src>` ultimately loads in the *user's browser*, not the sandbox,
so a remote CDN URL could work at runtime even if unverifiable here — but
unverifiable means risk of a broken image. Prefer downloading a verified asset
locally (into the artifact's `public/`) so it is self-hosted and inspectable.

**How to apply:** download candidates, inspect with `identify`/`file`, build a
`montage` and view it to confirm the mark is the right brand, then store under
`public/<dir>/` and reference via `${import.meta.env.BASE_URL}<dir>/<file>`
(Vite base path; BASE_URL ends in `/`). Don't reference `public/` assets with a
bare root-relative `/path` — that escapes the artifact base path.
