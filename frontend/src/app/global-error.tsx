"use client";

import { useEffect } from "react";
import { isChunkOrWebpackError } from "@/lib/chunk-errors";

export default function GlobalError({
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

  const isChunkError = isChunkOrWebpackError(error);

  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen items-center justify-center bg-[#09090e] p-6 font-sans text-[#ededf2]">
        <div className="max-w-md text-center">
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <p className="mt-3 text-sm text-[#9191a4]">
            {isChunkError
              ? "Webpack bundle mismatch — run npm run dev:fresh, then reload."
              : error.message || "An unexpected error occurred."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-[#8b5cf6] px-5 py-2.5 text-sm font-semibold text-white"
            >
              Reload page
            </button>
            <button
              type="button"
              onClick={() => reset()}
              className="rounded-xl border border-[#272730] px-5 py-2.5 text-sm font-medium text-[#9191a4]"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}