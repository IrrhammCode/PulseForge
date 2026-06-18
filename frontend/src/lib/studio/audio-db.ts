import type { StemId } from "@/types/studio";

const DB_NAME = "pulseforge_studio_audio";
const DB_VERSION = 1;
const STORE = "blobs";

export type AudioBlobKind = "mix" | StemId;

function blobKey(projectId: string, versionId: string, kind: AudioBlobKind) {
  return `${projectId}:${versionId}:${kind}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
  });
}

export async function saveAudioBlob(
  projectId: string,
  versionId: string,
  kind: AudioBlobKind,
  blob: Blob
): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
    tx.objectStore(STORE).put(blob, blobKey(projectId, versionId, kind));
  });
  db.close();
}

export async function getAudioBlob(
  projectId: string,
  versionId: string,
  kind: AudioBlobKind
): Promise<Blob | null> {
  const db = await openDb();
  const blob = await new Promise<Blob | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(blobKey(projectId, versionId, kind));
    request.onsuccess = () => resolve(request.result as Blob | undefined);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
  });
  db.close();
  return blob ?? null;
}

export async function deleteStemBlobs(projectId: string, versionId: string): Promise<void> {
  const kinds: StemId[] = ["vocals", "drums", "bass", "other"];
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    for (const kind of kinds) {
      store.delete(blobKey(projectId, versionId, kind));
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
  });
  db.close();
}

export async function deleteVersionAudio(projectId: string, versionId: string): Promise<void> {
  const kinds: AudioBlobKind[] = ["mix", "vocals", "drums", "bass", "other"];
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    for (const kind of kinds) {
      store.delete(blobKey(projectId, versionId, kind));
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
  });
  db.close();
}

export async function copyVersionAudio(
  projectId: string,
  fromVersionId: string,
  toVersionId: string
): Promise<void> {
  const kinds: AudioBlobKind[] = ["mix", "vocals", "drums", "bass", "other"];
  for (const kind of kinds) {
    const blob = await getAudioBlob(projectId, fromVersionId, kind);
    if (blob) {
      await saveAudioBlob(projectId, toVersionId, kind, blob);
    }
  }
}

export function createAudioObjectUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

export async function deleteProjectAudio(projectId: string): Promise<void> {
  const db = await openDb();
  const prefix = `${projectId}:`;
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        const key = String(cursor.key);
        if (key.startsWith(prefix)) {
          cursor.delete();
        }
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
  });
  db.close();
}

export async function clearAllAudio(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
  });
  db.close();
}

// === Per-clip custom audio (for AI vocals, takes, replacements per NLE section) ===
function clipKey(projectId: string, versionId: string, sectionId: string) {
  return `${projectId}:${versionId}:clip:${sectionId}`;
}

export async function saveClipAudio(
  projectId: string,
  versionId: string,
  sectionId: string,
  blob: Blob
): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
    tx.objectStore(STORE).put(blob, clipKey(projectId, versionId, sectionId));
  });
  db.close();
}

export async function getClipAudio(
  projectId: string,
  versionId: string,
  sectionId: string
): Promise<Blob | null> {
  const db = await openDb();
  const blob = await new Promise<Blob | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(clipKey(projectId, versionId, sectionId));
    request.onsuccess = () => resolve(request.result as Blob | undefined);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB get failed"));
  });
  db.close();
  return blob ?? null;
}

export async function deleteClipAudio(projectId: string, versionId: string, sectionId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(clipKey(projectId, versionId, sectionId));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
  });
  db.close();
}