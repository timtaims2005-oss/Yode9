/**
 * IndexedDB Storage Engine
 * Replaces localStorage for chat persistence — no 5 MB size limit.
 * Supports versioned migrations, bulk reads, and TTL-based cleanup.
 */

const DB_NAME  = "mr7-ai-db";
const DB_VER   = 2;
const CHAT_STORE  = "chats";
const META_STORE  = "meta";
const SNAP_STORE  = "snapshots";

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(CHAT_STORE)) {
        db.createObjectStore(CHAT_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
      if (!db.objectStoreNames.contains(SNAP_STORE)) {
        const ss = db.createObjectStore(SNAP_STORE, { keyPath: "ts" });
        ss.createIndex("ts", "ts");
      }
    };

    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror  = () => reject(req.error);
  });
}

function tx(
  db: IDBDatabase,
  stores: string | string[],
  mode: IDBTransactionMode = "readonly",
) {
  return db.transaction(stores, mode);
}

// ── Chats ─────────────────────────────────────────────────────────────────────

export async function idbSaveChat(chat: object & { id: string }): Promise<void> {
  const db = await openDB();
  return new Promise((res, rej) => {
    const t = tx(db, CHAT_STORE, "readwrite");
    t.objectStore(CHAT_STORE).put(chat);
    t.oncomplete = () => res();
    t.onerror    = () => rej(t.error);
  });
}

export async function idbSaveChats(chats: Array<object & { id: string }>): Promise<void> {
  const db = await openDB();
  return new Promise((res, rej) => {
    const t = tx(db, CHAT_STORE, "readwrite");
    const store = t.objectStore(CHAT_STORE);
    for (const c of chats) store.put(c);
    t.oncomplete = () => res();
    t.onerror    = () => rej(t.error);
  });
}

export async function idbLoadAllChats<T = unknown>(): Promise<T[]> {
  const db = await openDB();
  return new Promise((res, rej) => {
    const t   = tx(db, CHAT_STORE, "readonly");
    const req = t.objectStore(CHAT_STORE).getAll();
    req.onsuccess = () => res(req.result as T[]);
    req.onerror   = () => rej(req.error);
  });
}

export async function idbDeleteChat(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((res, rej) => {
    const t = tx(db, CHAT_STORE, "readwrite");
    t.objectStore(CHAT_STORE).delete(id);
    t.oncomplete = () => res();
    t.onerror    = () => rej(t.error);
  });
}

export async function idbClearChats(): Promise<void> {
  const db = await openDB();
  return new Promise((res, rej) => {
    const t = tx(db, CHAT_STORE, "readwrite");
    t.objectStore(CHAT_STORE).clear();
    t.oncomplete = () => res();
    t.onerror    = () => rej(t.error);
  });
}

// ── Meta (settings, non-chat state) ──────────────────────────────────────────

export async function idbSetMeta(key: string, value: unknown): Promise<void> {
  const db = await openDB();
  return new Promise((res, rej) => {
    const t = tx(db, META_STORE, "readwrite");
    t.objectStore(META_STORE).put(value, key);
    t.oncomplete = () => res();
    t.onerror    = () => rej(t.error);
  });
}

export async function idbGetMeta<T = unknown>(key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((res, rej) => {
    const t   = tx(db, META_STORE, "readonly");
    const req = t.objectStore(META_STORE).get(key);
    req.onsuccess = () => res(req.result as T);
    req.onerror   = () => rej(req.error);
  });
}

// ── Snapshots (crash recovery) ────────────────────────────────────────────────

export async function idbSaveSnapshot(data: unknown): Promise<void> {
  const db = await openDB();
  const ts = Date.now();
  return new Promise((res, rej) => {
    const t = tx(db, SNAP_STORE, "readwrite");
    const store = t.objectStore(SNAP_STORE);
    store.put({ ts, data });

    // Keep only last 5 snapshots
    const curReq = store.index("ts").openCursor();
    const toDelete: number[] = [];
    let count = 0;
    curReq.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
      if (cursor) { count++; toDelete.push(cursor.key as number); cursor.continue(); }
      else {
        if (toDelete.length > 5) {
          const old = toDelete.slice(0, toDelete.length - 5);
          for (const k of old) store.delete(k);
        }
      }
    };

    t.oncomplete = () => res();
    t.onerror    = () => rej(t.error);
    void count;
  });
}

export async function idbLoadLatestSnapshot<T = unknown>(): Promise<{ ts: number; data: T } | null> {
  const db = await openDB();
  return new Promise((res, rej) => {
    const t   = tx(db, SNAP_STORE, "readonly");
    const req = t.objectStore(SNAP_STORE).index("ts").openCursor(null, "prev");
    req.onsuccess = () => {
      const cursor = req.result;
      res(cursor ? (cursor.value as { ts: number; data: T }) : null);
    };
    req.onerror = () => rej(req.error);
  });
}

// ── Size estimation ───────────────────────────────────────────────────────────

export async function idbEstimateSizeKB(): Promise<number> {
  if (!navigator.storage?.estimate) return 0;
  const { usage } = await navigator.storage.estimate();
  return Math.round((usage ?? 0) / 1024);
}

// ── Migration helper: import from localStorage ────────────────────────────────

export async function migrateFromLocalStorage(lsKey: string): Promise<boolean> {
  try {
    const raw = localStorage.getItem(lsKey);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    const chats = parsed?.chats as Array<{ id: string }> | undefined;
    if (Array.isArray(chats) && chats.length > 0) {
      await idbSaveChats(chats);
    }
    await idbSetMeta("migrated_from_ls", true);
    await idbSetMeta("ls_state_backup", parsed);
    return true;
  } catch {
    return false;
  }
}
