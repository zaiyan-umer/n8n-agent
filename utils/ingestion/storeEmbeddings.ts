import { db } from "../../db/connection";
import { nodeChunks } from "../../db/schema/node_chunks";
import { EmbeddedChunk } from "./generateEmbeddings";
import { sql } from "drizzle-orm";

/**
 * Stores the generated embeddings into the node_chunks table.
 * Batches inserts in groups of 100 to optimize database execution parameters
 * and prevent statement constraints. Performs an upsert on primary key conflict.
 */
export async function storeGeneratedEmbeddings(chunks: EmbeddedChunk[]): Promise<void> {
    if (chunks.length === 0) return;

    const batchSize = 100;
    for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);

        await db
            .insert(nodeChunks)
            .values(
                batch.map((chunk) => ({
                    id: chunk.id,
                    nodeType: chunk.nodeType,
                    displayName: chunk.displayName,
                    operation: chunk.operation,
                    operationLabel: chunk.operationLabel,
                    chunkText: chunk.text,
                    embedding: chunk.embedding,
                }))
            )
            .onConflictDoUpdate({
                target: nodeChunks.id,
                set: {
                    nodeType: sql`excluded.node_type`,
                    displayName: sql`excluded.display_name`,
                    operation: sql`excluded.operation`,
                    operationLabel: sql`excluded.operation_label`,
                    chunkText: sql`excluded.chunk_text`,
                    embedding: sql`excluded.embedding`,
                },
            });
    }
}
