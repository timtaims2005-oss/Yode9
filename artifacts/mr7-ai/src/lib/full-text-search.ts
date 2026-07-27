/**
 * Full-Text Search Engine
 * In-memory inverted index with BM25-style scoring.
 * Indexes all chat messages and returns ranked results with snippets.
 * Re-indexes incrementally on new messages — no full rebuild needed.
 */

import type { Chat, ChatMsg } from "./store";

export type SearchHit = {
  chatId:    string;
  chatTitle: string;
  msgId:     string;
  role:      "user" | "assistant";
  ts:        number;
  snippet:   string;
  score:     number;
};

// ── Tokenizer ─────────────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[\u0610-\u061A\u064B-\u065F]/g, "") // strip Arabic diacritics
    .split(/[\s\W]+/)
    .filter(t => t.length > 1);
}

function buildSnippet(content: string, query: string, len = 140): string {
  const lc  = content.toLowerCase();
  const qw  = query.toLowerCase().split(/\s+/).find(w => lc.includes(w));
  const idx = qw ? lc.indexOf(qw) : 0;
  const start = Math.max(0, idx - 40);
  const end   = Math.min(content.length, start + len);
  let snippet = content.slice(start, end).replace(/\n+/g, " ");
  if (start > 0)              snippet = "…" + snippet;
  if (end < content.length)   snippet = snippet + "…";
  return snippet;
}

// ── Index ─────────────────────────────────────────────────────────────────────

type DocMeta = { chatId: string; chatTitle: string; msgId: string; role: "user"|"assistant"; ts: number; content: string; tokens: string[] };

class FullTextSearch {
  /** token → Set of docKeys */
  private index   = new Map<string, Set<string>>();
  /** docKey → doc metadata */
  private docs    = new Map<string, DocMeta>();
  /** docKey = chatId:msgId */
  private indexed = new Set<string>();

  // ── Indexing ───────────────────────────────────────────────────────────────

  indexChat(chat: Chat) {
    for (const msg of chat.messages) {
      this.indexMessage(chat.id, chat.title, msg);
    }
  }

  indexChats(chats: Chat[]) {
    for (const c of chats) this.indexChat(c);
  }

  indexMessage(chatId: string, chatTitle: string, msg: ChatMsg) {
    const key = `${chatId}:${msg.id}`;
    if (this.indexed.has(key)) return;
    this.indexed.add(key);

    const tokens = tokenize(msg.content);
    this.docs.set(key, { chatId, chatTitle, msgId: msg.id, role: msg.role, ts: msg.ts, content: msg.content, tokens });
    for (const t of new Set(tokens)) {
      if (!this.index.has(t)) this.index.set(t, new Set());
      this.index.get(t)!.add(key);
    }
  }

  removeChat(chatId: string) {
    for (const [key, meta] of this.docs) {
      if (meta.chatId === chatId) {
        for (const t of meta.tokens) {
          this.index.get(t)?.delete(key);
        }
        this.docs.delete(key);
        this.indexed.delete(key);
      }
    }
  }

  updateChatTitle(chatId: string, title: string) {
    for (const meta of this.docs.values()) {
      if (meta.chatId === chatId) meta.chatTitle = title;
    }
  }

  clear() {
    this.index.clear();
    this.docs.clear();
    this.indexed.clear();
  }

  // ── Search ─────────────────────────────────────────────────────────────────

  search(query: string, limit = 30): SearchHit[] {
    if (!query.trim()) return [];
    const qTokens = tokenize(query);
    if (!qTokens.length) return [];

    // Gather candidate doc keys (union of all token matches)
    const candidates = new Map<string, number>(); // key → score

    const N = this.docs.size || 1;

    for (const qt of qTokens) {
      // Exact matches
      const exact = this.index.get(qt);
      if (exact) {
        const idf = Math.log(1 + N / exact.size);
        for (const k of exact) {
          const doc = this.docs.get(k)!;
          const tf  = doc.tokens.filter(t => t === qt).length / doc.tokens.length;
          candidates.set(k, (candidates.get(k) ?? 0) + tf * idf * 2);
        }
      }
      // Prefix matches
      for (const [token, keys] of this.index) {
        if (token !== qt && token.startsWith(qt)) {
          const idf = Math.log(1 + N / keys.size);
          for (const k of keys) {
            const doc = this.docs.get(k)!;
            const tf  = doc.tokens.filter(t => t === token).length / doc.tokens.length;
            candidates.set(k, (candidates.get(k) ?? 0) + tf * idf * 0.7);
          }
        }
      }
    }

    // Build sorted results
    const hits: SearchHit[] = [];
    for (const [key, score] of candidates) {
      const meta = this.docs.get(key);
      if (!meta) continue;
      hits.push({
        chatId:    meta.chatId,
        chatTitle: meta.chatTitle,
        msgId:     meta.msgId,
        role:      meta.role,
        ts:        meta.ts,
        snippet:   buildSnippet(meta.content, query),
        score,
      });
    }

    return hits
      .sort((a, b) => b.score - a.score || b.ts - a.ts)
      .slice(0, limit);
  }

  get docCount() { return this.docs.size; }
  get tokenCount() { return this.index.size; }
}

export const fts = new FullTextSearch();
