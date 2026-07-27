/**
 * Task 4 — unified document text extraction for the auto-attachment pipeline.
 *
 * Supports PDF (pdf-parse), Word (.docx via mammoth), Excel (.xlsx/.xls/.csv
 * via the `xlsx` package), and plain text. Callers are responsible for
 * capping the returned text (see MAX_EXTRACT_CHARS) — this module returns
 * whatever it extracted, untruncated, so it can also be reused for full
 * downloads if ever needed.
 */
import * as XLSX from "xlsx";

export const MAX_EXTRACT_CHARS = 50_000;

export interface ExtractResult {
  text: string;
  truncated: boolean;
  kind: "pdf" | "docx" | "spreadsheet" | "text" | "unsupported";
}

function capText(text: string): { text: string; truncated: boolean } {
  if (text.length > MAX_EXTRACT_CHARS) {
    return { text: text.slice(0, MAX_EXTRACT_CHARS), truncated: true };
  }
  return { text, truncated: false };
}

async function extractPdf(buffer: Buffer): Promise<string> {
  // Dynamic import to avoid DOMMatrix crash at startup (pdf-parse v2 bundles pdfjs-dist)
  const pdfParseMod = await import("pdf-parse");
  const pdfParse: (buf: Buffer) => Promise<{ text: string; numpages: number }> =
    (pdfParseMod as any).default ?? (pdfParseMod as any);
  const parsed = await pdfParse(buffer);
  return parsed.text ?? "";
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await (mammoth as any).extractRawText({ buffer });
  return result.value ?? "";
}

function extractSpreadsheet(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const parts: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    parts.push(`--- ${sheetName} ---\n${csv}`);
  }
  return parts.join("\n\n");
}

/**
 * Extract text content from a document buffer given its mime type and/or
 * filename extension. Returns `kind: "unsupported"` (empty text) for types
 * this pipeline does not know how to parse (callers should fall back to
 * treating it as an opaque attachment).
 */
export async function extractDocumentText(
  buffer: Buffer,
  mimeType: string,
  filename: string,
): Promise<ExtractResult> {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const isPdf = mimeType.includes("pdf") || ext === "pdf";
  const isDocx =
    mimeType.includes("wordprocessingml") || ext === "docx" || ext === "doc";
  const isSpreadsheet =
    mimeType.includes("spreadsheetml") ||
    mimeType.includes("ms-excel") ||
    ["xlsx", "xls", "csv"].includes(ext);
  const isPlainText =
    mimeType.startsWith("text/") || ["txt", "md", "json", "log"].includes(ext);

  try {
    if (isPdf) {
      const { text, truncated } = capText(await extractPdf(buffer));
      return { text, truncated, kind: "pdf" };
    }
    if (isDocx) {
      const { text, truncated } = capText(await extractDocx(buffer));
      return { text, truncated, kind: "docx" };
    }
    if (isSpreadsheet) {
      const { text, truncated } = capText(extractSpreadsheet(buffer));
      return { text, truncated, kind: "spreadsheet" };
    }
    if (isPlainText) {
      const { text, truncated } = capText(buffer.toString("utf-8"));
      return { text, truncated, kind: "text" };
    }
    return { text: "", truncated: false, kind: "unsupported" };
  } catch (err) {
    return {
      text: `[فشل استخراج النص من الملف: ${err instanceof Error ? err.message : String(err)}]`,
      truncated: false,
      kind: "unsupported",
    };
  }
}

export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}
