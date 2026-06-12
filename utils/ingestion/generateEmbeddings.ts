import { google } from "@ai-sdk/google";
import { embedMany } from "ai";
import { EmbedChunk } from "./types";

export interface EmbeddedChunk extends EmbedChunk {
  embedding: number[];
}

/**
 * Takes an array of EmbedChunks and generates embeddings using Google's gemini-embedding-001 model.
 * Batches requests in groups of 100 to optimize performance and respect rate limits.
 */
export async function generateChunksEmbeddings(
  chunks: EmbedChunk[]
): Promise<EmbeddedChunk[]> {
  if (chunks.length === 0) return [];

  const texts = chunks.map((c) => c.text);
  const result: EmbeddedChunk[] = [];

  let attempt = 0;
  while (true) {
    try {
      // Generate embeddings in batch
      const { embeddings } = await embedMany({
        model: google.embeddingModel(process.env.TEXT_EMBEDDING_MODEL || "gemini-embedding-001"),
        values: texts,
      });

      // Map the vector arrays back to the respective chunks
      for (let j = 0; j < chunks.length; j++) {
        result.push({
          ...chunks[j],
          embedding: embeddings[j],
        });
      }
      break; // Success, exit retry loop
    } catch (err: any) {
      attempt++;
      const isRateLimit =
        err.statusCode === 429 ||
        err.status === 429 ||
        String(err).includes("quota") ||
        String(err).includes("429") ||
        String(err).includes("Quota exceeded");

      if (isRateLimit && attempt <= 5) {
        let sleepSeconds = 60;

        // Attempt to parse the API responseBody for exact RetryInfo details
        try {
          const body = err.responseBody ? JSON.parse(err.responseBody) : null;
          const retryInfo = body?.error?.details?.find((d: any) =>
            d["@type"]?.includes("RetryInfo")
          );
          if (retryInfo?.retryDelay) {
            const parsed = parseInt(retryInfo.retryDelay);
            if (!isNaN(parsed) && parsed > 0) {
              sleepSeconds = parsed;
            }
          }
        } catch (parseErr) {
          // Fallback: search the error string for a numeric delay match
          const match = String(err).match(/retry in ([\d.]+)s/i);
          if (match && match[1]) {
            sleepSeconds = Math.ceil(parseFloat(match[1]));
          }
        }

        const sleepMs = (sleepSeconds + 2) * 1000;
        console.warn(
          `[Embeddings] Rate limited (429). Sleeping ${
            sleepSeconds + 2
          }s before retry (attempt ${attempt}/5)...`
        );
        await new Promise((resolve) => setTimeout(resolve, sleepMs));
      } else {
        // Non-rate-limit error or max retries reached, propagate error upward
        throw err;
      }
    }
  }

  return result;
}
