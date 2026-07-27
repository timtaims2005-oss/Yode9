/**
 * ai-processor.worker.ts
 * Web Worker for heavy off-main-thread operations:
 * - Markdown → HTML conversion
 * - Token counting
 * - Context compression / decompression
 * Launched via workerPool from worker-pool.ts
 */

// ── Message types ─────────────────────────────────────────────────────────────

type TaskType = 'markdown' | 'tokenCount' | 'compress' | 'decompress';

interface WorkerRequest {
  id: string;
  type: TaskType;
  payload: unknown;
}

interface WorkerResponse {
  id: string;
  ok: true;
  result: unknown;
}

interface WorkerError {
  id: string;
  ok: false;
  error: string;
}

// ── Markdown → HTML (minimal, zero-dependency) ────────────────────────────────

function markdownToHtml(md: string): string {
  let html = md
    // Code blocks (fenced)
    .replace(/```(\w*)\n([\s\S]*?)```/gm, (_m, lang, code) =>
      `<pre><code class="language-${lang || 'text'}">${escapeHtml(code.trim())}</code></pre>`
    )
    // Inline code
    .replace(/`([^`]+)`/g, (_m, code) => `<code>${escapeHtml(code)}</code>`)
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Strikethrough
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    // Headings
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Blockquote
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // Unordered list items
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    // Ordered list items
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr/>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    // Images
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2"/>')
    // Paragraphs: blank lines → </p><p>
    .replace(/\n\n+/g, '</p><p>')
    // Line breaks within paragraphs
    .replace(/\n/g, '<br/>');

  return `<p>${html}</p>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Token counting (GPT-style approximation) ──────────────────────────────────

function countTokens(text: string): number {
  // Approximate: ~4 chars per token for English text
  // More accurate for code: whitespace-split words
  const words = text.trim().split(/\s+/).length;
  const charTokens = Math.ceil(text.length / 4);
  // Average of word-based and char-based estimates
  return Math.round((words + charTokens) / 2);
}

// ── Context compression (LZ-based using btoa/atob) ───────────────────────────

function compress(text: string): string {
  // Run-length encoding for repeated whitespace sequences
  const rle = text.replace(/ {2,}/g, m => `\x01${m.length}\x01`);
  // Base64 encode
  try {
    return btoa(unescape(encodeURIComponent(rle)));
  } catch {
    return btoa(rle);
  }
}

function decompress(encoded: string): string {
  try {
    const rle = decodeURIComponent(escape(atob(encoded)));
    return rle.replace(/\x01(\d+)\x01/g, (_m, n) => ' '.repeat(parseInt(n, 10)));
  } catch {
    return atob(encoded);
  }
}

// ── Message handler ───────────────────────────────────────────────────────────

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, type, payload } = event.data;

  try {
    let result: unknown;

    switch (type) {
      case 'markdown':
        result = markdownToHtml(payload as string);
        break;

      case 'tokenCount':
        result = countTokens(payload as string);
        break;

      case 'compress':
        result = compress(payload as string);
        break;

      case 'decompress':
        result = decompress(payload as string);
        break;

      default:
        throw new Error(`Unknown task type: ${type}`);
    }

    const response: WorkerResponse = { id, ok: true, result };
    self.postMessage(response);
  } catch (err) {
    const error: WorkerError = {
      id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(error);
  }
};

// Signal ready
self.postMessage({ id: '__ready__', ok: true, result: 'ai-processor ready' });
