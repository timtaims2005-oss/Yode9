/**
 * Invoice PDF Generator
 * ─────────────────────
 * Renders a simple, branded PDF invoice for a completed Stripe payment
 * using pdfkit (pure Node, no external binaries required).
 */
import PDFDocument from "pdfkit";

export interface InvoicePdfInput {
  invoiceId: string;
  invoiceNumber: string;
  issuedAt: Date;
  customerName?: string | null;
  customerEmail: string;
  planName: string;
  amount: number;
  currency: string;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  stripeInvoiceId?: string | null;
}

export function generateInvoicePdf(input: InvoicePdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const currency = input.currency.toUpperCase();
      const formattedAmount = `${input.amount.toFixed(2)} ${currency}`;

      // ── Header ──────────────────────────────────────────────────
      doc
        .fillColor("#6366f1")
        .fontSize(24)
        .text("mr7.ai", { continued: false })
        .fillColor("#111827")
        .fontSize(10)
        .text("AI & Cybersecurity Platform")
        .moveDown(1.5);

      doc
        .fontSize(18)
        .fillColor("#111827")
        .text("Invoice", { align: "right" })
        .fontSize(10)
        .fillColor("#6b7280")
        .text(`Invoice #: ${input.invoiceNumber}`, { align: "right" })
        .text(`Date: ${input.issuedAt.toISOString().slice(0, 10)}`, { align: "right" });

      if (input.stripeInvoiceId) {
        doc.text(`Stripe ref: ${input.stripeInvoiceId}`, { align: "right" });
      }

      doc.moveDown(1.5);
      doc.strokeColor("#e5e7eb").moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1);

      // ── Bill to ─────────────────────────────────────────────────
      doc.fontSize(11).fillColor("#111827").text("Billed to:");
      doc.fontSize(10).fillColor("#374151");
      if (input.customerName) doc.text(input.customerName);
      doc.text(input.customerEmail);
      doc.moveDown(1.5);

      // ── Line item table ─────────────────────────────────────────
      const tableTop = doc.y;
      doc.fontSize(10).fillColor("#6b7280");
      doc.text("Description", 50, tableTop);
      doc.text("Period", 300, tableTop);
      doc.text("Amount", 480, tableTop, { width: 65, align: "right" });

      doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).strokeColor("#e5e7eb").stroke();

      const rowY = tableTop + 25;
      doc.fontSize(10).fillColor("#111827");
      doc.text(`${input.planName} subscription`, 50, rowY, { width: 240 });
      const period = input.periodStart && input.periodEnd
        ? `${input.periodStart.toISOString().slice(0, 10)} – ${input.periodEnd.toISOString().slice(0, 10)}`
        : "—";
      doc.text(period, 300, rowY, { width: 170 });
      doc.text(formattedAmount, 480, rowY, { width: 65, align: "right" });

      doc.moveDown(3);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#e5e7eb").stroke();
      doc.moveDown(0.5);

      // ── Total ───────────────────────────────────────────────────
      doc.fontSize(12).fillColor("#111827").text("Total paid", 350, doc.y, { width: 130, align: "left" });
      doc.fontSize(12).fillColor("#111827").text(formattedAmount, 480, doc.y - 14, { width: 65, align: "right" });

      doc.moveDown(3);
      doc
        .fontSize(9)
        .fillColor("#9ca3af")
        .text(
          "This is an automatically generated invoice for your mr7.ai subscription payment. " +
            "For billing questions, contact support@mr7.ai.",
          { width: 495 },
        );

      doc.end();
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}
