/**
 * Office File Export Routes
 * POST /api/files/docx  → Word (.docx)
 * POST /api/files/xlsx  → Excel (.xlsx)
 * POST /api/files/pptx  → PowerPoint (.pptx)
 */
import { Router, type Request, type Response } from "express";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType } from "docx";
import * as XLSX from "xlsx";
// @ts-ignore – pptxgenjs has no bundled types in all versions
import PptxGenJs from "pptxgenjs";

const router = Router();

// ── DOCX ─────────────────────────────────────────────────────────────────────
/**
 * Body: {
 *   title?: string,
 *   content: Array<{
 *     type: "heading1"|"heading2"|"heading3"|"paragraph"|"table",
 *     text?: string,
 *     rows?: string[][]   // for table
 *   }>
 * }
 */
router.post("/files/docx", async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, content = [] } = req.body as {
      title?: string;
      content: Array<{
        type: string;
        text?: string;
        rows?: string[][];
      }>;
    };

    const children: (Paragraph | Table)[] = [];

    if (title) {
      children.push(
        new Paragraph({
          text: title,
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
        }),
      );
    }

    for (const block of content) {
      if (block.type === "heading1" && block.text) {
        children.push(new Paragraph({ text: block.text, heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 } }));
      } else if (block.type === "heading2" && block.text) {
        children.push(new Paragraph({ text: block.text, heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }));
      } else if (block.type === "heading3" && block.text) {
        children.push(new Paragraph({ text: block.text, heading: HeadingLevel.HEADING_3, spacing: { before: 160, after: 80 } }));
      } else if (block.type === "paragraph" && block.text) {
        // Support simple **bold** and *italic* inline markers
        const parts = block.text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
        const runs = parts.map(p => {
          if (p.startsWith("**") && p.endsWith("**")) return new TextRun({ text: p.slice(2, -2), bold: true });
          if (p.startsWith("*") && p.endsWith("*")) return new TextRun({ text: p.slice(1, -1), italics: true });
          return new TextRun({ text: p });
        });
        children.push(new Paragraph({ children: runs, spacing: { after: 120 } }));
      } else if (block.type === "table" && block.rows && block.rows.length > 0) {
        const rows = block.rows.map((row, rIdx) =>
          new TableRow({
            children: row.map(cell =>
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: cell, bold: rIdx === 0 })] })],
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
                  bottom: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
                  left: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
                  right: { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" },
                },
              }),
            ),
          }),
        );
        children.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
        children.push(new Paragraph({ text: "", spacing: { after: 120 } })); // spacer after table
      }
    }

    const doc = new Document({
      sections: [{ children }],
    });

    const buffer = await Packer.toBuffer(doc);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(title ?? "document")}.docx"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: "DOCX generation failed. Please try again." });
  }
});

// ── XLSX ─────────────────────────────────────────────────────────────────────
/**
 * Body: {
 *   filename?: string,
 *   sheets: Array<{
 *     name: string,
 *     headers: string[],
 *     rows: (string|number)[][]
 *   }>
 * }
 */
router.post("/files/xlsx", async (req: Request, res: Response): Promise<void> => {
  try {
    const { filename = "spreadsheet", sheets = [] } = req.body as {
      filename?: string;
      sheets: Array<{
        name: string;
        headers: string[];
        rows: (string | number)[][];
      }>;
    };

    const wb = XLSX.utils.book_new();

    for (const sheet of sheets) {
      const data = [sheet.headers, ...sheet.rows];
      const ws = XLSX.utils.aoa_to_sheet(data);

      // Bold header row styling (XLSX limited styling without xlsx-style)
      const colWidths = sheet.headers.map((h, i) => {
        const maxLen = Math.max(
          h.length,
          ...sheet.rows.map(r => String(r[i] ?? "").length),
        );
        return { wch: Math.min(maxLen + 4, 50) };
      });
      ws["!cols"] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
    }

    if (wb.SheetNames.length === 0) {
      // Empty fallback sheet
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["No data"]]), "Sheet1");
    }

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}.xlsx"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: "XLSX generation failed. Please try again." });
  }
});

// ── PPTX ─────────────────────────────────────────────────────────────────────
/**
 * Body: {
 *   title?: string,
 *   slides: Array<{
 *     title?: string,
 *     content?: string,
 *     bullets?: string[],
 *     layout?: "title"|"content"|"two-col"
 *   }>
 * }
 */
router.post("/files/pptx", async (req: Request, res: Response): Promise<void> => {
  try {
    const { title = "Presentation", slides = [] } = req.body as {
      title?: string;
      slides: Array<{
        title?: string;
        content?: string;
        bullets?: string[];
        layout?: string;
      }>;
    };

    const pptx = new PptxGenJs();
    pptx.layout = "LAYOUT_WIDE";

    // Title slide
    const titleSlide = pptx.addSlide();
    titleSlide.background = { color: "0A0A14" };
    titleSlide.addText(title, {
      x: "10%", y: "35%", w: "80%", h: "20%",
      fontSize: 40, bold: true, color: "E21227",
      align: "center", fontFace: "Arial",
    });

    // Content slides
    for (const slide of slides) {
      const s = pptx.addSlide();
      s.background = { color: "0A0A14" };

      // Title bar
      if (slide.title) {
        s.addShape("rect", { x: 0, y: 0, w: "100%", h: 1.1, fill: { color: "1A0A10" } });
        s.addText(slide.title, {
          x: 0.3, y: 0.1, w: "95%", h: 0.9,
          fontSize: 24, bold: true, color: "E21227", fontFace: "Arial",
        });
      }

      const contentY = slide.title ? 1.4 : 0.5;

      if (slide.bullets && slide.bullets.length > 0) {
        const bulletItems = slide.bullets.map(b => ({ text: `• ${b}`, options: { bullet: false } }));
        s.addText(bulletItems.map(b => b.text).join("\n"), {
          x: 0.5, y: contentY, w: "90%", h: 5,
          fontSize: 16, color: "E5E7EB", fontFace: "Arial",
          valign: "top", align: "left",
          charSpacing: 0.5,
        });
      } else if (slide.content) {
        s.addText(slide.content, {
          x: 0.5, y: contentY, w: "90%", h: 5,
          fontSize: 16, color: "E5E7EB", fontFace: "Arial",
          valign: "top",
        });
      }
    }

    const buffer = await pptx.write({ outputType: "nodebuffer" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(title)}.pptx"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: "PPTX generation failed. Please try again." });
  }
});

export default router;
