// ── Drizzle Schema Barrel Export ──────────────────────────────────────────────
// All tables exported from here are the single source of truth for the DB schema.
// To add a new table: create schema/<name>.ts then add an export line below.
//
// Conflict notes:
//  - api-keys.ts (legacy, simple, device-based) is intentionally NOT exported —
//    api_keys.ts (comprehensive, user-linked, with indexes) is the canonical version.
//    api-keys.ts is kept on disk only as a reference until db.ts is fully retired.

export * from "./users";
export * from "./conversations";
export * from "./messages";
export * from "./api_keys";        // comprehensive version (user-linked, with indexes)
export * from "./api_usage";
export * from "./audit-logs";
export * from "./cloud-chats";
export * from "./invoices";
export * from "./knowledge_base";
export * from "./modules";
export * from "./notifications";
export * from "./reports";
export * from "./security_events";
export * from "./sensitive-tool-audit-log";
export * from "./subscriptions";
export * from "./teams";
export * from "./user_subscriptions";
export * from "./webhooks";
export * from "./agents";
