import { pgTable, serial, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Audit trail for every attempted call to a "sensitive" tool or route
 * (code execution, raw SQL, OSINT / threat-intel lookups, dark-web tools).
 *
 * This table is shared by two guardrail enforcement points:
 *   - `src/routes/orchestrate.ts` (primary chat/tool path, raw pool.query inserts)
 *   - `src/lib/guardrails.ts` (used by /api/chat's tool loop and OSINT/dark-web
 *     REST routes)
 * Column shape must stay in sync with the `CREATE TABLE` in `src/db.ts`.
 *
 * IMPORTANT: only metadata is stored here — never raw credentials, secrets,
 * or full request bodies. `argsSummary` must be pre-sanitized by the caller.
 */
export const sensitiveToolAuditLog = pgTable("sensitive_tool_audit_log", {
  id: serial("id").primaryKey(),
  deviceId: varchar("device_id"),
  ip: varchar("ip"),
  toolName: varchar("tool_name").notNull(),
  argsSummary: text("args_summary"),          // sanitized JSON string, metadata only
  verdict: varchar("verdict").notNull(),      // "allowed" | "blocked"
  blockReason: text("block_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertSensitiveToolAuditLogSchema = createInsertSchema(sensitiveToolAuditLog).omit({
  id: true,
  createdAt: true,
});
export type SensitiveToolAuditLog = typeof sensitiveToolAuditLog.$inferSelect;
export type InsertSensitiveToolAuditLog = z.infer<typeof insertSensitiveToolAuditLogSchema>;
