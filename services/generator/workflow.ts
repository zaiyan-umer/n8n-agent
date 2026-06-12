import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";
import { WORKFLOW_GENERATOR_PROMPT } from "../../utils/prompts";
import { RetrievedChunk } from "../vector-store/retriever";

export async function generateWorkflow(message: string, intent: string, context: RetrievedChunk[]) {
  // Format the retrieved technical documentation for the LLM prompt
  const contextString = context
    .map((c) => {
      const operationStr = c.operation ? ` | Operation: ${c.operation} (${c.operationLabel || "N/A"})` : "";
      return `--- NODE: ${c.displayName} (${c.nodeType})${operationStr} ---\n${c.chunkText}`;
    })
    .join("\n\n");

  const fullPrompt = `
User Message: ${message}
Parsed Intent: ${intent}

Technical Context (Available Node Documentation):
${contextString}

Generate a complete, valid n8n workflow JSON based on this context.
  `.trim();

  const { output } = await generateText({
    model: google(process.env.MODEL_NAME || "gemini-3.1-flash-lite-preview"),
    system: WORKFLOW_GENERATOR_PROMPT,
    prompt: fullPrompt,
    output: Output.object({
      schema: z.object({
        nodes: z.array(z.record(z.string(), z.any())).describe("Array of n8n node objects defining the workflow steps."),
        connections: z.record(z.string(), z.any()).describe("Object defining the routing connections between the nodes."),
      }),
    }),
  });

  return output;
}
