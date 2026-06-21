"use client";

import { useEffect } from "react";
import { setupDomainBridge } from "@/lib/domain/setup-domain-bridge";

/**
 * Ensures the global domain event bridge is active.
 * Auto-orchestrator handlers are registered in setup-domain-bridge via the event coordinator.
 */
export function useDomainEventOrchestrator() {
  useEffect(() => setupDomainBridge(), []);
}