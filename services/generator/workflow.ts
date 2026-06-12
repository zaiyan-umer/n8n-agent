import { RetrievedChunk } from "../vector-store/retriever";

// TODO: Implement LLM workflow generation
export async function generateWorkflow(message: string, intent: string, context: RetrievedChunk[]) {
  return { nodes: [], connections: {} };
}
