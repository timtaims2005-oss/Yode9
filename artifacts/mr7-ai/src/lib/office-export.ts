/**
 * Office Export Client Utilities
 * Calls the api-server endpoints to generate Word/Excel/PowerPoint files
 * and triggers browser download automatically.
 */

const BASE = "/api";

// ── Types ─────────────────────────────────────────────────────────────────────
export type DocxBlock =
  | { type: "heading1" | "heading2" | "heading3" | "paragraph"; text: string }
  | { type: "table"; rows: string[][] };

export interface DocxPayload {
  title?: string;
  content: DocxBlock[];
}

export interface XlsxSheet {
  name: string;
  headers: string[];
  rows: (string | number)[][];
}

export interface XlsxPayload {
  filename?: string;
  sheets: XlsxSheet[];
}

export interface PptxSlide {
  title?: string;
  content?: string;
  bullets?: string[];
  layout?: "title" | "content" | "two-col";
}

export interface PptxPayload {
  title?: string;
  slides: PptxSlide[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
async function downloadBlob(res: Response, filename: string) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error((err as { error?: string }).error ?? `Export failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Parsers: Extract structured content from raw markdown ─────────────────────
export function parseMarkdownToDocx(markdown: string, title?: string): DocxPayload {
  const lines = markdown.split("\n");
  const content: DocxBlock[] = [];

  for (const line of lines) {
    const h1 = line.match(/^# (.+)/);
    const h2 = line.match(/^## (.+)/);
    const h3 = line.match(/^### (.+)/);
    if (h1) { content.push({ type: "heading1", text: h1[1] }); continue; }
    if (h2) { content.push({ type: "heading2", text: h2[1] }); continue; }
    if (h3) { content.push({ type: "heading3", text: h3[1] }); continue; }
    if (line.trim()) content.push({ type: "paragraph", text: line });
  }

  return { title, content };
}

export function parseMarkdownToPptx(markdown: string, title?: string): PptxPayload {
  const slides: PptxSlide[] = [];
  const lines = markdown.split("\n");
  let currentSlide: PptxSlide | null = null;

  for (const line of lines) {
    const h1 = line.match(/^# (.+)/);
    const h2 = line.match(/^## (.+)/);
    if (h1 || h2) {
      if (currentSlide) slides.push(currentSlide);
      currentSlide = { title: (h1 || h2)![1], bullets: [] };
    } else if (line.match(/^[-*]\s+(.+)/)) {
      const bullet = line.replace(/^[-*]\s+/, "");
      if (!currentSlide) currentSlide = { bullets: [] };
      currentSlide.bullets ??= [];
      currentSlide.bullets.push(bullet);
    } else if (line.trim() && currentSlide) {
      currentSlide.content = (currentSlide.content ? currentSlide.content + "\n" : "") + line;
    }
  }
  if (currentSlide) slides.push(currentSlide);
  if (slides.length === 0) slides.push({ title: title ?? "Slide 1", content: markdown.slice(0, 500) });

  return { title: title ?? "Presentation", slides };
}

// ── Export Functions ──────────────────────────────────────────────────────────
export async function exportDocx(payload: DocxPayload): Promise<void> {
  const res = await fetch(`${BASE}/files/docx`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  await downloadBlob(res, `${payload.title ?? "document"}.docx`);
}

export async function exportXlsx(payload: XlsxPayload): Promise<void> {
  const res = await fetch(`${BASE}/files/xlsx`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  await downloadBlob(res, `${payload.filename ?? "spreadsheet"}.xlsx`);
}

export async function exportPptx(payload: PptxPayload): Promise<void> {
  const res = await fetch(`${BASE}/files/pptx`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  await downloadBlob(res, `${payload.title ?? "presentation"}.pptx`);
}

// ── Smart auto-export from message text ───────────────────────────────────────
/**
 * Detects intent from message text and exports appropriate format.
 * Returns the format used, or null if no export triggered.
 */
export async function smartExport(messageText: string): Promise<"docx" | "xlsx" | "pptx" | null> {
  const lower = messageText.toLowerCase();

  // Table detection → Excel
  if (lower.includes("| ") && lower.includes(" |")) {
    // Extract markdown table
    const tableLines = messageText.split("\n").filter(l => l.trim().startsWith("|"));
    if (tableLines.length >= 2) {
      const headers = tableLines[0].split("|").map(h => h.trim()).filter(Boolean);
      const rows = tableLines.slice(2).map(l => l.split("|").map(c => c.trim()).filter(Boolean));
      await exportXlsx({ filename: "data", sheets: [{ name: "Sheet1", headers, rows }] });
      return "xlsx";
    }
  }

  // Slide/presentation keywords → PowerPoint
  if (/شريحة|عرض تقديمي|presentation|slide|بوربوينت|powerpoint/i.test(lower)) {
    const payload = parseMarkdownToPptx(messageText);
    await exportPptx(payload);
    return "pptx";
  }

  // Default: Word document
  const payload = parseMarkdownToDocx(messageText, "Document");
  await exportDocx(payload);
  return "docx";
}
