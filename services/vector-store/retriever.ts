import { db } from "../../db/connection";
import { nodeChunks } from "../../db/schema/node_chunks";
import { cosineDistance, desc, gt, sql, and, eq } from "drizzle-orm";
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
  limit: number = 3,
  threshold: number = 0.60
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
  let allResults: RetrievedChunk[] = [];

  if (nodes && nodes.length > 0) {
    // If nodes are predicted, get the top chunks for EACH node to guarantee representation
    const nodePromises = nodes.map(async (nodeType) => {
      return await db
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
        .where(and(eq(nodeChunks.nodeType, nodeType), gt(similarity, threshold)))
        .orderBy((t) => desc(t.similarity))
        .limit(limit);
    });

    const resultsArrays = await Promise.all(nodePromises);
    allResults = resultsArrays.flat();
  } else {
    // Fallback: global search if no specific nodes predicted
    allResults = await db
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
  }

  // Sort the final combined results by similarity just to keep the most relevant ones at top
  allResults.sort((a, b) => b.similarity - a.similarity);

  return allResults;
}
