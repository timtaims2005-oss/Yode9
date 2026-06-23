import { pgTable, serial, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cloudChats = pgTable("cloud_chats", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull().unique(),
  chatsJson: jsonb("chats_json").notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertCloudChatSchema = createInsertSchema(cloudChats).omit({ id: true });
export type CloudChat = typeof cloudChats.$inferSelect;
export type InsertCloudChat = z.infer<typeof insertCloudChatSchema>;
