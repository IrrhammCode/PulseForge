"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { chunkErrorMessage, isChunkOrWebpackError } from "@/lib/chunk-errors";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    if (isChunkOrWebpackError(error)) {
      const key = "pf_chunk_reload";
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
      }
    }
  }, [error]);

  const isChunk = isChunkOrWebpackError(error);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="mt-3 text-sm text-muted">{chunkErrorMessage(error)}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {isChunk && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            <RefreshCw className="h-4 w-4" />
            Reload page
          </button>
        )}
        <button type="button" onClick={() => reset()} className="btn-secondary">
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      </div>
    </div>
  );
}