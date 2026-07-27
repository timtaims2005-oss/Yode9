import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  jsonb,
  integer,
  numeric,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { users } from "./users";

export const userSubscriptions = pgTable(
  "user_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

    plan: text("plan").notNull(),
    billingCycle: text("billing_cycle").notNull().default("monthly"),
    priceUsd: numeric("price_usd", { precision: 10, scale: 2 }),

    status: text("status").notNull().default("active"),

    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),

    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    stripePriceId: text("stripe_price_id"),
    stripeProductId: text("stripe_product_id"),

    limits: jsonb("limits").default({}),

    usageResetAt: timestamp("usage_reset_at", { withTimezone: true }),
    messagesUsed: integer("messages_used").default(0).notNull(),
    agentRunsUsed: integer("agent_runs_used").default(0).notNull(),
    tokensUsed: integer("tokens_used").default(0).notNull(),

    metadata: jsonb("metadata").default({}),
    cancelReason: text("cancel_reason"),
    isAutoRenew: boolean("is_auto_renew").default(true).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("usub_user_id_idx").on(t.userId),
    index("usub_status_idx").on(t.status),
    index("usub_plan_idx").on(t.plan),
    index("usub_stripe_customer_idx").on(t.stripeCustomerId),
    index("usub_ends_at_idx").on(t.endsAt),
  ],
);

export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectUserSubscriptionSchema = createSelectSchema(userSubscriptions);
export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;
