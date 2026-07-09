/**
 * Invoices — user-facing list & download endpoints
 * ─────────────────────────────────────────────────
 * GET /api/invoices             → paginated list of the current user's invoices
 * GET /api/invoices/:id         → single invoice detail
 * GET /api/invoices/:id/download → redirect to the stored PDF
 */
import { Router, type Request, type Response } from "express";
import { pool } from "../db";
import { jwtAuth, requireAuth } from "../middlewares/jwtAuth";

const router = Router();

router.get("/invoices", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseInt(req.query["limit"] as string) || 20, 100);
    const offset = parseInt(req.query["offset"] as string) || 0;

    const { rows } = await pool.query(
      `SELECT id, plan_id, amount, currency, status, description,
              period_start, period_end, stripe_invoice_id, pdf_url, created_at
       FROM invoices WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [req.authUser!.id, limit, offset],
    );
    const { rows: cnt } = await pool.query("SELECT COUNT(*) as total FROM invoices WHERE user_id = $1", [req.authUser!.id]);
    res.json({ invoices: rows, total: parseInt(cnt[0].total, 10), limit, offset });
  } catch {
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

router.get("/invoices/:id", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM invoices WHERE id = $1 AND user_id = $2",
      [req.params.id, req.authUser!.id],
    );
    if (!rows.length) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }
    res.json({ invoice: rows[0] });
  } catch {
    res.status(500).json({ error: "Failed to fetch invoice" });
  }
});

router.get("/invoices/:id/download", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { rows } = await pool.query(
      "SELECT pdf_url FROM invoices WHERE id = $1 AND user_id = $2",
      [req.params.id, req.authUser!.id],
    );
    if (!rows.length || !rows[0].pdf_url) {
      res.status(404).json({ error: "Invoice PDF not found" });
      return;
    }
    res.redirect(rows[0].pdf_url as string);
  } catch {
    res.status(500).json({ error: "Failed to download invoice" });
  }
});

export default router;
