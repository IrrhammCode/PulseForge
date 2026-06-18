"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  acquireTabLock,
  initTabLock,
  isBlockedByOtherTab,
  subscribeTabLockBlocked,
} from "@pulseforge/shared/lib/studio/tab-lock";
import { cn } from "@/lib/utils";

export function TabLockBanner({ className }: { className?: string }) {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const cleanup = initTabLock();
    setBlocked(isBlockedByOtherTab());
    const unsubscribe = subscribeTabLockBlocked(setBlocked);
    return () => {
      unsubscribe();
      cleanup();
    };
  }, []);

  if (!blocked) return null;

  return (
    <div
      role="status"
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning",
        className
      )}
    >
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      <span>
        <span className="font-semibold">Another PulseForge tab is editing studio data.</span>{" "}
        Keep one tab active to avoid localStorage conflicts.
      </span>
      <button
        type="button"
        onClick={() => acquireTabLock()}
        className="rounded-full border border-warning/50 px-2 py-0.5 text-[10px] font-semibold text-foreground transition hover:bg-warning/20"
      >
        Use this tab
      </button>
    </div>
  );
}