import { useCallback } from "react";
import { useLocation, useParams as useWouterParams, useSearch } from "wouter";

/** Drop-in replacements for next/navigation backed by wouter. */
export function useRouter() {
  const [, navigate] = useLocation();
  const push = useCallback((href: string) => navigate(href), [navigate]);
  const replace = useCallback(
    (href: string) => navigate(href, { replace: true }),
    [navigate],
  );
  return {
    push,
    replace,
    back: () => window.history.back(),
    forward: () => window.history.forward(),
    refresh: () => {},
    prefetch: () => {},
  };
}

export function usePathname(): string {
  const [location] = useLocation();
  return location || "/";
}

export function useParams<
  T extends Record<string, string | string[]> = Record<string, string>,
>(): T {
  return useWouterParams() as T;
}

export function useSearchParams(): URLSearchParams {
  const search = useSearch();
  return new URLSearchParams(search);
}

export function redirect(href: string): void {
  if (typeof window !== "undefined") window.location.assign(href);
}
