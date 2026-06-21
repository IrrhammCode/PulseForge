
import { useEffect } from "react";
import { setupDomainBridge } from "@/lib/domain/setup-domain-bridge";

/**
 * Ensures the global domain event bridge is active.
 * Cloud push handlers are registered in setup-domain-bridge via the event coordinator.
 */
export function useDomainEventCloudSync() {
  useEffect(() => setupDomainBridge(), []);
}