import { google } from "@ai-sdk/google";
import { embedMany } from "ai";
import { EmbedChunk } from "./types";

export interface EmbeddedChunk extends EmbedChunk {
  embedding: number[];
}

/**
 * Takes an array of EmbedChunks and generates embeddings using Google's text-embedding-004 model.
 * Batches requests in groups of 100 to optimize performance and respect rate limits.
 */
export async function generateChunksEmbeddings(
  chunks: EmbedChunk[]
): Promise<EmbeddedChunk[]> {
    
  const result: EmbeddedChunk[] = [];
  const batchSize = 100;

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const texts = batch.map((c) => c.text);

    // Generate embeddings in batch
    const { embeddings } = await embedMany({
      model: google.embeddingModel(process.env.TEXT_EMBEDDING_MODEL || "text-embedding-004"),
      values: texts,
    });

    // Map the vector arrays back to the respective chunks
    for (let j = 0; j < batch.length; j++) {
      result.push({
        ...batch[j],
        embedding: embeddings[j],
      });
    }
  }

  return result;
}
