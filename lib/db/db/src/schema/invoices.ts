import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { users } from "./users";

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

    stripeInvoiceId: text("stripe_invoice_id"),
    stripeSessionId: text("stripe_session_id"),
    planId: text("plan_id"),

    amount: numeric("amount", { precision: 10, scale: 2 }).notNull().default("0"),
    currency: text("currency").notNull().default("usd"),
    status: text("status").notNull().default("paid"),
    description: text("description"),

    periodStart: timestamp("period_start", { withTimezone: true }),
    periodEnd: timestamp("period_end", { withTimezone: true }),

    pdfUrl: text("pdf_url"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("invoices_user_id_idx").on(t.userId),
    index("invoices_status_idx").on(t.status),
    index("invoices_created_at_idx").on(t.createdAt),
  ],
);

export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true });
export const selectInvoiceSchema = createSelectSchema(invoices);
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
