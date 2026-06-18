"use client";

import { enterApp } from "@/lib/onboarding";
import { cn } from "@/lib/utils";

interface WelcomeLinkProps {
  href: string;
  className?: string;
  children: React.ReactNode;
}

/** Button styled as link — avoids Next.js Link prefetch chunk conflicts on landing */
export function WelcomeLink({ href, className, children }: WelcomeLinkProps) {
  return (
    <button
      type="button"
      onClick={() => enterApp(href)}
      className={cn(className)}
    >
      {children}
    </button>
  );
}