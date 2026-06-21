---
name: Vercel/Next → Vite port gotchas
description: Non-obvious runtime traps when porting a Next.js/v0 app into the Vite + React pnpm_workspace stack
---

# Porting Next.js / v0 apps to Vite + React

Lessons from porting the PulseForge app (Next.js → Vite). These are runtime traps that
typecheck/`pnpm install` do NOT catch — they only surface when a module is actually
requested in the browser, so a clean page shell (curl HTTP 200) means nothing.

## `process.env` in shared/browser code crashes with "process is not defined"
Server-only code (API-key getters, capability adapters) that reads `process.env` gets
pulled into the browser bundle via shared libs. Vite does NOT define `process` in the
browser.
- **Fix:** add `define: { "process.env": {} }` to the frontend `vite.config.ts`. This
  only affects the browser bundle; the Node backend keeps real `process.env`.
- **Why:** one blanket fix beats guarding every accessor; secrets should be undefined in
  the browser anyway (frontend goes through the backend API).

## Incomplete import snapshots: verify named EXPORTS, not just module existence
A `.migration-backup` snapshot can be missing whole modules AND individual named exports
that consumers import. A scanner that only checks "does the module resolve?" misses
missing named exports — those throw `does not provide an export named 'X'` at runtime.
- **How to apply:** run `tsc --noEmit` once early; it lists ALL missing exports / casing
  conflicts / `next/*` imports in one pass instead of discovering them one-by-one via the
  Vite runtime-error overlay. Stub missing exports with graceful degradation (return
  null/`{}` or throw a friendly `ApiError`) matching the app's existing fallback pattern.

## Rules-of-hooks violations only surface at runtime on specific routes
Imported components sometimes call a hook AFTER an early `return null` (e.g. a wouter
`useRouter()` placed below `if (!ready) return null`). Works until that branch flips,
then React throws "Rendered more hooks than during the previous render."
- **How to apply:** detector — body-level (2-space-indent) early return followed by a
  body-level `const x = useX(` is the real violation; hooks inside helper functions or
  nested components are false positives. Hoist all hooks above every early return.

## Verification
Type-only TS errors do NOT break Vite runtime (esbuild strips types). Only missing
modules/exports, casing mismatches, `next/*` imports, and `process` refs break it. Verify
with a screenshot + the e2e testing agent across every route, not curl.
