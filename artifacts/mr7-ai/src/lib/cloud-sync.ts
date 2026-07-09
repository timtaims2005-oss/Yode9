import { type Chat } from "./store";

const DEVICE_ID_KEY = "mr7-device-id";
const SYNC_DEBOUNCE_MS = 3000;

function getOrCreateDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = "dev-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function getDeviceId(): string {
  return getOrCreateDeviceId();
}

export async function fetchCloudChats(): Promise<Chat[] | null> {
  try {
    const deviceId = getOrCreateDeviceId();
    const res = await fetch(`/api/cloud-chats?deviceId=${encodeURIComponent(deviceId)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data.chats) || data.chats.length === 0) return null;
    return data.chats as Chat[];
  } catch {
    return null;
  }
}

export async function pushCloudChats(chats: Chat[]): Promise<void> {
  try {
    const deviceId = getOrCreateDeviceId();
    await fetch("/api/cloud-chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, chats }),
    });
  } catch {
    // ignore — offline or server down
  }
}

let _debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function schedulePush(chats: Chat[]) {
  if (_debounceTimer) clearTimeout(_debounceTimer);
  _debounceTimer = setTimeout(() => {
    pushCloudChats(chats);
  }, SYNC_DEBOUNCE_MS);
}

export type SyncStatus = "idle" | "syncing" | "synced" | "error";
