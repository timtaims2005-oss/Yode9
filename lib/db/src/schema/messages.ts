import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  index,
  numeric,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { conversations } from "./conversations";

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),

    model: text("model"),
    promptTokens: integer("prompt_tokens").default(0),
    completionTokens: integer("completion_tokens").default(0),
    totalTokens: integer("total_tokens").default(0),
    responseMs: integer("response_ms"),
    finishReason: text("finish_reason"),

    costUsd: numeric("cost_usd", { precision: 10, scale: 6 }),

    toolCalls: jsonb("tool_calls").default([]),
    toolCallId: text("tool_call_id"),

    attachments: jsonb("attachments").default([]),

    userRating: integer("user_rating"),
    userFeedback: text("user_feedback"),
    isBookmarked: boolean("is_bookmarked").default(false).notNull(),

    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("msg_conversation_id_idx").on(t.conversationId),
    index("msg_role_idx").on(t.role),
    index("msg_model_idx").on(t.model),
    index("msg_created_at_idx").on(t.createdAt),
  ],
);

export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const selectMessageSchema = createSelectSchema(messages);
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
