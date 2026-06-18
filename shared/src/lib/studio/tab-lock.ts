export const TAB_LOCK_STORAGE_KEY = "pulseforge_tab_lock";
export const TAB_LOCK_CHANNEL_NAME = "pulseforge-tab-lock";
export const TAB_LOCK_TTL_MS = 5000;
export const TAB_LOCK_HEARTBEAT_MS = 2000;

export interface TabLockRecord {
  tabId: string;
  heartbeatAt: number;
}

type TabLockMessage =
  | { type: "claim"; tabId: string; heartbeatAt: number }
  | { type: "heartbeat"; tabId: string; heartbeatAt: number }
  | { type: "release"; tabId: string }
  | { type: "reject"; tabId: string; holderId: string; heartbeatAt: number };

type BlockedListener = (blocked: boolean) => void;

let tabId: string | null = null;
let channel: BroadcastChannel | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let ownsLock = false;
const blockedListeners = new Set<BlockedListener>();

function isBrowser(): boolean {
  return typeof localStorage !== "undefined";
}

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

function getTabId(): string {
  if (!tabId) {
    tabId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `tab-${Math.random().toString(36).slice(2)}`;
  }
  return tabId;
}

function readLockRecord(): TabLockRecord | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(TAB_LOCK_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TabLockRecord;
    if (typeof parsed.tabId !== "string" || typeof parsed.heartbeatAt !== "number") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeLockRecord(record: TabLockRecord): void {
  if (!isBrowser()) return;
  localStorage.setItem(TAB_LOCK_STORAGE_KEY, JSON.stringify(record));
}

function clearLockRecord(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(TAB_LOCK_STORAGE_KEY);
}

function isExpired(record: TabLockRecord, now = Date.now()): boolean {
  return now - record.heartbeatAt > TAB_LOCK_TTL_MS;
}

function notifyBlockedListeners(): void {
  const blocked = isBlockedByOtherTab();
  for (const listener of blockedListeners) {
    listener(blocked);
  }
}

function ensureChannel(): BroadcastChannel | null {
  if (!isBrowser() || typeof BroadcastChannel === "undefined") return null;
  if (!channel) {
    channel = new BroadcastChannel(TAB_LOCK_CHANNEL_NAME);
    channel.onmessage = (event: MessageEvent<TabLockMessage>) => {
      handleChannelMessage(event.data);
    };
  }
  return channel;
}

function postMessage(message: TabLockMessage): void {
  ensureChannel()?.postMessage(message);
}

function stopHeartbeat(): void {
  if (heartbeatTimer != null) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function startHeartbeat(): void {
  stopHeartbeat();
  if (!isBrowser()) return;
  heartbeatTimer = setInterval(() => {
    if (!ownsLock) return;
    const now = Date.now();
    writeLockRecord({ tabId: getTabId(), heartbeatAt: now });
    postMessage({ type: "heartbeat", tabId: getTabId(), heartbeatAt: now });
  }, TAB_LOCK_HEARTBEAT_MS);
}

function handleChannelMessage(message: TabLockMessage): void {
  if (!message || message.tabId === getTabId()) return;

  switch (message.type) {
    case "claim": {
      if (!ownsLock) {
        notifyBlockedListeners();
        return;
      }
      const now = Date.now();
      writeLockRecord({ tabId: getTabId(), heartbeatAt: now });
      postMessage({
        type: "reject",
        tabId: getTabId(),
        holderId: getTabId(),
        heartbeatAt: now,
      });
      break;
    }
    case "reject": {
      if (message.holderId !== getTabId() && ownsLock) {
        ownsLock = false;
        stopHeartbeat();
        clearLockRecord();
        notifyBlockedListeners();
      }
      break;
    }
    case "release":
    case "heartbeat":
      notifyBlockedListeners();
      break;
  }
}

/** True when another tab holds a fresh studio write lock. */
export function isBlockedByOtherTab(): boolean {
  const record = readLockRecord();
  if (!record || isExpired(record)) return false;
  return record.tabId !== getTabId();
}

/** Attempt to acquire the studio tab lock for this tab. */
export function acquireTabLock(): boolean {
  if (!isBrowser()) return true;

  ensureChannel();
  const now = Date.now();
  const record = readLockRecord();

  if (!record || isExpired(record, now) || record.tabId === getTabId()) {
    writeLockRecord({ tabId: getTabId(), heartbeatAt: now });
    ownsLock = true;
    startHeartbeat();
    postMessage({ type: "claim", tabId: getTabId(), heartbeatAt: now });
    notifyBlockedListeners();
    return true;
  }

  ownsLock = false;
  stopHeartbeat();
  notifyBlockedListeners();
  return false;
}

/** Release the lock when this tab owns it. */
export function releaseTabLock(): void {
  if (!isBrowser()) return;

  const record = readLockRecord();
  if (record?.tabId === getTabId()) {
    clearLockRecord();
  }
  ownsLock = false;
  stopHeartbeat();
  postMessage({ type: "release", tabId: getTabId() });
  notifyBlockedListeners();
}

export function subscribeTabLockBlocked(listener: BlockedListener): () => void {
  blockedListeners.add(listener);
  listener(isBlockedByOtherTab());
  return () => {
    blockedListeners.delete(listener);
  };
}

/** Acquire on mount, keep heartbeats alive, release on cleanup. */
export function initTabLock(): () => void {
  if (!isBrowser()) return () => {};

  ensureChannel();
  acquireTabLock();

  if (!hasWindow()) return () => releaseTabLock();

  const onStorage = (event: StorageEvent) => {
    if (event.key === TAB_LOCK_STORAGE_KEY) {
      notifyBlockedListeners();
    }
  };
  window.addEventListener("storage", onStorage);

  const onVisibility = () => {
    if (document.visibilityState === "visible") {
      acquireTabLock();
    }
  };
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    releaseTabLock();
    window.removeEventListener("storage", onStorage);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}

/** Test helper to reset in-memory tab state without clearing persisted lock data. */
export function resetTabLockForTests(nextTabId?: string): void {
  stopHeartbeat();
  ownsLock = false;
  tabId = nextTabId ?? null;
  blockedListeners.clear();
  if (channel) {
    channel.close();
    channel = null;
  }
}