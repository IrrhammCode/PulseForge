import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearTestStorage } from "@/test/setup";
import {
  acquireTabLock,
  isBlockedByOtherTab,
  releaseTabLock,
  resetTabLockForTests,
  TAB_LOCK_STORAGE_KEY,
  TAB_LOCK_TTL_MS,
} from "@/lib/studio/tab-lock";

type TabLockMessage = {
  type: string;
  tabId: string;
  heartbeatAt?: number;
  holderId?: string;
};

class MockBroadcastChannel {
  static channels = new Map<string, Set<MockBroadcastChannel>>();

  onmessage: ((event: MessageEvent<TabLockMessage>) => void) | null = null;

  constructor(public readonly name: string) {
    if (!MockBroadcastChannel.channels.has(name)) {
      MockBroadcastChannel.channels.set(name, new Set());
    }
    MockBroadcastChannel.channels.get(name)!.add(this);
  }

  postMessage(data: TabLockMessage): void {
    const peers = MockBroadcastChannel.channels.get(this.name);
    peers?.forEach((peer) => {
      if (peer !== this) {
        peer.onmessage?.({ data } as MessageEvent<TabLockMessage>);
      }
    });
  }

  close(): void {
    MockBroadcastChannel.channels.get(this.name)?.delete(this);
  }

  static reset(): void {
    MockBroadcastChannel.channels.clear();
  }
}

describe("tab-lock", () => {
  beforeEach(() => {
    clearTestStorage();
    MockBroadcastChannel.reset();
    vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
    resetTabLockForTests();
  });

  afterEach(() => {
    resetTabLockForTests();
    MockBroadcastChannel.reset();
  });

  it("acquires and releases the lock for a single tab", () => {
    resetTabLockForTests("tab-a");

    expect(acquireTabLock()).toBe(true);
    expect(isBlockedByOtherTab()).toBe(false);
    expect(localStorage.getItem(TAB_LOCK_STORAGE_KEY)).toMatch(/tab-a/);

    releaseTabLock();
    expect(localStorage.getItem(TAB_LOCK_STORAGE_KEY)).toBeNull();
  });

  it("blocks a second tab when the first lock is fresh", () => {
    resetTabLockForTests("tab-a");
    expect(acquireTabLock()).toBe(true);

    resetTabLockForTests("tab-b");
    expect(acquireTabLock()).toBe(false);
    expect(isBlockedByOtherTab()).toBe(true);
  });

  it("allows takeover after the lock TTL expires", () => {
    const staleHeartbeat = Date.now() - TAB_LOCK_TTL_MS - 1;
    localStorage.setItem(
      TAB_LOCK_STORAGE_KEY,
      JSON.stringify({ tabId: "tab-a", heartbeatAt: staleHeartbeat })
    );

    resetTabLockForTests("tab-b");
    expect(acquireTabLock()).toBe(true);
    expect(isBlockedByOtherTab()).toBe(false);
    expect(JSON.parse(localStorage.getItem(TAB_LOCK_STORAGE_KEY) ?? "{}").tabId).toBe(
      "tab-b"
    );
  });

  it("rejects a steal attempt via BroadcastChannel", () => {
    resetTabLockForTests("tab-a");
    expect(acquireTabLock()).toBe(true);

    resetTabLockForTests("tab-b");
    expect(acquireTabLock()).toBe(false);

    const record = JSON.parse(localStorage.getItem(TAB_LOCK_STORAGE_KEY) ?? "{}") as {
      tabId: string;
    };
    expect(record.tabId).toBe("tab-a");
  });
});