"use client";

import { useEffect } from "react";
import { setupDomainBridge } from "@/lib/domain/setup-domain-bridge";

/** Invisible bridge — coordinates stale flags, auto-orchestrator, and cloud sync. */
export function DomainEventBridge() {
  useEffect(() => setupDomainBridge(), []);
  return null;
}