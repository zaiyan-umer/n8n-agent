import { pgTable, uuid, text, timestamp, jsonb, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { conversations } from "./conversations";

export const deployedWorkflows = pgTable(
  "deployed_workflows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id").references(() => conversations.id),
    n8nWorkflowId: text("n8n_workflow_id").notNull(),
    name: text("name"),
    workflowJson: jsonb("workflow_json").notNull(),
    status: text("status").default("deployed"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("deployed_workflows_conversation_id_idx").on(table.conversationId),
    check("status_check", sql`${table.status} in ('deployed', 'updated', 'deleted')`),
  ]
);
