/** Detect stale webpack chunks and script load failures in Next.js dev. */
export function isChunkOrWebpackError(reason: unknown): boolean {
  if (reason instanceof Event) return true;

  if (reason instanceof Error) {
    const msg = reason.message.toLowerCase();
    // Only true stale-chunk / dynamic-import-load signatures. Generic runtime
    // errors ("failed to fetch", "cannot read properties of undefined",
    // "reading 'call'") are NOT chunk errors — matching them turned ordinary
    // app bugs into an endless window.location.reload() loop.
    return (
      reason.name === "ChunkLoadError" ||
      msg.includes("loading chunk") ||
      msg.includes("failed to fetch dynamically imported module") ||
      msg.includes("error loading dynamically imported module") ||
      msg.includes("importing a module script failed") ||
      msg.includes("vendor-chunks") ||
      msg.includes("webpack")
    );
  }

  if (typeof reason === "string") {
    const lower = reason.toLowerCase();
    return (
      lower.includes("loading chunk") ||
      lower.includes("failed to fetch dynamically imported module")
    );
  }

  return Object.prototype.toString.call(reason) === "[object Event]";
}

export function chunkErrorMessage(reason: unknown): string {
  if (isChunkOrWebpackError(reason)) {
    return "App bundle failed to load — usually a stale dev cache. Run npm run dev:fresh and reload.";
  }
  if (reason instanceof Error && reason.message && reason.message !== "[object Event]") {
    return reason.message;
  }
  return "An unexpected error occurred.";
}