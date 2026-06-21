---
name: Studio local-first persistence
description: Why same-tab UI doesn't auto-update after command* writes, and how to refresh it.
---

The PulseForge studio is local-first: projects live in localStorage, mutated via
`command*` functions (`commandUpdateProject`, `commandSaveLyrics`, `commandSaveAnalysis`,
etc.) in `lib/domain/project-commands`.

**Rule:** `useStudioProject(id)` and `useStudioProjects()` only re-render on the browser
`storage` event, which **does not fire in the same tab** that wrote the change. A component
that mutates a project (e.g. a modal launched from a card on the list page) must explicitly
trigger a parent refresh.

**Why:** The dashboard `ProjectCard` "Optimize & Ship" wizard commits fixes via `command*`
straight to localStorage; without a callback the project list shows stale scores until reload.

**How to apply:** Have the list page pass its `useStudioProjects().refresh` down as an
`onChanged` prop and call it after committing. Inside a single project page, prefer the
hook's own `save*`/`update` methods (they `setProject` locally) over raw `command*`.
