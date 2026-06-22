---
name: Shared test suite needs vitest config
description: Why lib/shared tests can silently fail to run, and what makes them runnable.
---

# lib/shared tests need a vitest config that mirrors the `@/` path alias

The `lib/shared` test files import via the `@/` alias (e.g. `@/lib/scoring/simulation`),
which is defined only in `tsconfig.json` `paths`. Vitest does NOT read tsconfig paths
on its own.

**Symptom:** `pnpm --filter @pulseforge/shared run test` fails every suite with
`Cannot find package '@/...'` / `Failed to load url @/...` — i.e. ZERO tests run. This
reads like an infra error, not a test failure, so it's easy to assume "tests pass"
when in reality they never executed.

**Fix / requirement:** `lib/shared/vitest.config.ts` must define
`resolve.alias { "@": <src> }` (and `setupFiles: ["./src/test/setup.ts"]`). With it,
the full suite runs.

**Why this matters:** enabling the suite can surface genuine pre-existing logic
failures that were dormant while the runner was broken. Treat a newly-runnable suite
as a fresh signal, not noise — fix the real failures it reveals.
