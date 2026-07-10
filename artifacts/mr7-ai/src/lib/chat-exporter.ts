/**
 * Chat Exporter
 * Exports single chats or the full history as Markdown, JSON, or plain text.
 * Works entirely client-side — no server required.
 */

import type { Chat, ChatMsg } from "./store";

// ── Helpers ───────────────────────────────────────────────────────────────────

function dateStr(ts: number) {
  return new Date(ts).toLocaleString("ar-SA", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

function download(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function slugify(s: string) {
  return s.replace(/[^\w\u0600-\u06FF ]/g, "").trim().replace(/\s+/g, "-").slice(0, 40) || "chat";
}

// ── Markdown export ───────────────────────────────────────────────────────────

function chatToMarkdown(chat: Chat): string {
  const lines: string[] = [
    `# ${chat.title}`,
    `> تاريخ الإنشاء: ${dateStr(chat.createdAt)}`,
    `> عدد الرسائل: ${chat.messages.length}`,
    "",
  ];

  for (const msg of chat.messages) {
    const role  = msg.role === "user" ? "👤 المستخدم" : "🤖 المساعد";
    const model = msg.model ? ` *(${msg.model})*` : "";
    lines.push(`## ${role}${model}`);
    lines.push(`*${dateStr(msg.ts)}*`);
    lines.push("");
    lines.push(msg.content);
    lines.push("");
    lines.push("---");
    lines.push("");
  }
  return lines.join("\n");
}

export function exportChatAsMarkdown(chat: Chat) {
  download(chatToMarkdown(chat), `${slugify(chat.title)}.md`, "text/markdown;charset=utf-8");
}

export function exportAllChatsAsMarkdown(chats: Chat[]) {
  const parts = chats.map(c => chatToMarkdown(c));
  const full  = parts.join("\n\n---\n\n# ═══ نهاية المحادثة ═══\n\n");
  download(full, `mr7-ai-all-chats-${Date.now()}.md`, "text/markdown;charset=utf-8");
}

// ── JSON export ───────────────────────────────────────────────────────────────

export function exportChatAsJSON(chat: Chat) {
  const payload = JSON.stringify({ version: 2, exported: Date.now(), chat }, null, 2);
  download(payload, `${slugify(chat.title)}.json`, "application/json");
}

export function exportAllChatsAsJSON(chats: Chat[]) {
  const payload = JSON.stringify({ version: 2, exported: Date.now(), chats }, null, 2);
  download(payload, `mr7-ai-backup-${Date.now()}.json`, "application/json");
}

// ── Plain text export ─────────────────────────────────────────────────────────

export function exportChatAsText(chat: Chat) {
  const lines: string[] = [
    `=== ${chat.title} ===`,
    `إنشاء: ${dateStr(chat.createdAt)}`,
    "",
  ];
  for (const msg of chat.messages) {
    const role = msg.role === "user" ? "[المستخدم]" : "[المساعد]";
    lines.push(`${role} ${dateStr(msg.ts)}`);
    lines.push(msg.content);
    lines.push("");
  }
  download(lines.join("\n"), `${slugify(chat.title)}.txt`, "text/plain;charset=utf-8");
}

// ── Import from JSON backup ───────────────────────────────────────────────────

export async function importChatsFromJSON(): Promise<Chat[]> {
  return new Promise((resolve, reject) => {
    const input   = document.createElement("input");
    input.type    = "file";
    input.accept  = ".json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) { reject(new Error("لم يتم اختيار ملف")); return; }
      try {
        const text   = await file.text();
        const parsed = JSON.parse(text);
        const chats  = (parsed.chat ? [parsed.chat] : parsed.chats) as Chat[];
        if (!Array.isArray(chats)) throw new Error("صيغة الملف غير صحيحة");
        resolve(chats);
      } catch (e) {
        reject(e);
      }
    };
    input.click();
  });
}

// ── Stats helper ──────────────────────────────────────────────────────────────

export function chatStats(chats: Chat[]) {
  let totalMsgs = 0, totalChars = 0;
  const models  = new Set<string>();
  for (const c of chats) {
    for (const m of c.messages) {
      totalMsgs++;
      totalChars += m.content.length;
      if (m.model) models.add(m.model);
    }
  }
  return { totalChats: chats.length, totalMsgs, totalChars, uniqueModels: [...models] };
}

// ── Copy single message to clipboard ─────────────────────────────────────────

export async function copyMessageToClipboard(msg: ChatMsg): Promise<void> {
  const text = `${msg.role === "user" ? "المستخدم" : "المساعد"} (${dateStr(msg.ts)}):\n\n${msg.content}`;
  await navigator.clipboard.writeText(text);
}
