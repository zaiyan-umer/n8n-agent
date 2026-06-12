import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { vector } from "drizzle-orm/pg-core";

export const nodeChunks = pgTable(
  "node_chunks",
  {
    id: text("id").primaryKey(),
    nodeType: text("node_type").notNull(),
    displayName: text("display_name").notNull(),
    operation: text("operation"),
    operationLabel: text("operation_label"),
    version: integer("version"),
    groupType: text("group_type"),
    docsUrl: text("docs_url"),
    chunkText: text("chunk_text").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("node_chunks_embedding_idx")
      .using("ivfflat", table.embedding.op("vector_cosine_ops"))
      .with({ lists: 100 }),
  ]
);
