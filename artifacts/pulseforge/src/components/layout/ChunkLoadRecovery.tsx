
import { useEffect } from "react";
import { isChunkOrWebpackError } from "@/lib/chunk-errors";

const RELOAD_KEY = "pf_chunk_reload";

function tryReloadOnce(): void {
  if (typeof window === "undefined") return;
  if (sessionStorage.getItem(RELOAD_KEY)) return;
  sessionStorage.setItem(RELOAD_KEY, "1");
  window.location.reload();
}

export function ChunkLoadRecovery() {
  useEffect(() => {
    const clearTimer = setTimeout(() => {
      sessionStorage.removeItem(RELOAD_KEY);
    }, 8000);

    const onWindowError = (event: ErrorEvent) => {
      const msg = event.message?.toLowerCase() ?? "";
      if (
        isChunkOrWebpackError(event.error) ||
        msg.includes("reading 'call'") ||
        msg.includes("loading chunk") ||
        msg.includes("vendor-chunks") ||
        msg.includes("enoent")
      ) {
        event.preventDefault();
        tryReloadOnce();
      }
    };

    const onScriptError = (event: Event) => {
      if (event.target instanceof HTMLScriptElement) {
        tryReloadOnce();
      }
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      if (isChunkOrWebpackError(event.reason)) {
        event.preventDefault();
        tryReloadOnce();
      }
    };

    window.addEventListener("error", onWindowError);
    window.addEventListener("error", onScriptError, true);
    window.addEventListener("unhandledrejection", onRejection);

    return () => {
      clearTimeout(clearTimer);
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("error", onScriptError, true);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}