import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared editorial layout primitives for the bold monochrome theme.
 * Off-white bg, black ink, flat 2px black borders, Anton uppercase headlines.
 */

export function PageHeader({
  badge,
  meta,
  title,
  description,
  actions,
  className,
}: {
  badge: string;
  meta?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("", className)}>
      <div className="flex items-center justify-between gap-4 border-b-2 border-foreground pb-3">
        <span className="landing-eyebrow flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-foreground" />
          {badge}
        </span>
        {meta && <span className="landing-eyebrow text-right">{meta}</span>}
      </div>
      <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <h1 className="font-display text-4xl uppercase leading-[0.9] tracking-tight md:text-5xl lg:text-6xl 2xl:text-7xl">
            {title}
          </h1>
          {description && (
            <p className="mt-4 max-w-xl text-sm text-muted md:text-base">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
    </header>
  );
}

export function SectionHead({
  title,
  eyebrow,
  action,
  className,
}: {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-5 flex items-end justify-between gap-4 border-t-2 border-foreground pt-4",
        className
      )}
    >
      <div>
        {eyebrow && <p className="landing-eyebrow">{eyebrow}</p>}
        <h2 className="font-display mt-1 text-2xl uppercase leading-none tracking-tight md:text-3xl">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

export function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border-2 border-foreground bg-surface p-5", className)}>
      {children}
    </div>
  );
}
