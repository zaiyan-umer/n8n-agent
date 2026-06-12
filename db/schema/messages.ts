import { pgTable, uuid, text, timestamp, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { conversations } from "./conversations";

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id").references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role"),
    content: text("content").notNull(),
    toolCallId: text("tool_call_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("messages_conversation_id_created_at_idx").on(table.conversationId, table.createdAt),
    check("role_check", sql`${table.role} in ('user', 'assistant', 'tool')`),
  ]
);
