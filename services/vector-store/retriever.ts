import { db } from "../../db/connection";
import { nodeChunks } from "../../db/schema/node_chunks";
import { cosineDistance, desc, gt, sql } from "drizzle-orm";
import { embed } from "ai";
import { google } from "@ai-sdk/google";

export type RetrievedChunk = {
  id: string;
  nodeType: string;
  displayName: string;
  operation: string | null;
  operationLabel: string | null;
  docsUrl: string | null;
  chunkText: string;
  similarity: number;
};

/**
 * Generates an embedding for the predicted nodes and intent,
 * and retrieves relevant node chunks using pgvector's cosine distance.
 */
export async function retrieveContext(
  nodes: string[],
  intent: string,
  limit: number = 5,
  threshold: number = 0.75
): Promise<RetrievedChunk[]> {
  // Combine intent and predicted nodes for a semantic search query
  const searchQuery = `Nodes: ${nodes.join(", ")}. Intent: ${intent}`;

  // 1. Generate embedding for the query
  const { embedding } = await embed({
    model: google.embeddingModel(process.env.TEXT_EMBEDDING_MODEL || "gemini-embedding-001"),
    value: searchQuery,
  });

  // 2. Calculate cosine similarity
  const similarity = sql<number>`1 - (${cosineDistance(
    nodeChunks.embedding,
    embedding
  )})`;

  // 3. Perform KNN search
  const results = await db
    .select({
      id: nodeChunks.id,
      nodeType: nodeChunks.nodeType,
      displayName: nodeChunks.displayName,
      operation: nodeChunks.operation,
      operationLabel: nodeChunks.operationLabel,
      docsUrl: nodeChunks.docsUrl,
      chunkText: nodeChunks.chunkText,
      similarity,
    })
    .from(nodeChunks)
    .where(gt(similarity, threshold))
    .orderBy((t) => desc(t.similarity))
    .limit(limit);

  return results;
}
