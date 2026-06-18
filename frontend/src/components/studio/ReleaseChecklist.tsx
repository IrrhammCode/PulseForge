"use client";

import { Check, Circle } from "lucide-react";
import type { ChecklistItem } from "@/lib/studio/launch";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface ReleaseChecklistProps {
  items: ChecklistItem[];
  readiness: number;
  onToggle: (id: string) => void;
}

export function ReleaseChecklist({ items, readiness, onToggle }: ReleaseChecklistProps) {
  return (
    <Card glow="none" className="h-full">
      <CardHeader
        title="Release Checklist"
        subtitle={`${readiness}% launch-ready`}
        action={
          <span
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-bold tabular-nums",
              readiness >= 80
                ? "border-success/30 bg-success/10 text-success"
                : readiness >= 50
                  ? "border-accent/30 bg-accent-muted text-accent-light"
                  : "border-border bg-surface text-muted"
            )}
          >
            {readiness}%
          </span>
        }
      />

      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => !item.auto && onToggle(item.id)}
              disabled={item.auto}
              className={cn(
                "flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                item.done
                  ? "border-success/30 bg-success/5"
                  : "border-border bg-surface hover:border-accent/25",
                item.auto && "cursor-default"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                  item.done
                    ? "border-success bg-success text-white"
                    : "border-border text-transparent"
                )}
              >
                {item.done ? <Check className="h-3 w-3" /> : <Circle className="h-3 w-3 text-border" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm", item.done ? "text-foreground" : "text-muted")}>
                  {item.label}
                </p>
                {item.hint && !item.done && (
                  <p className="text-[10px] text-muted">{item.hint}</p>
                )}
                {item.auto && item.done && (
                  <p className="text-[10px] text-success">Auto-detected</p>
                )}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}