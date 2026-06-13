import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";
import { WORKFLOW_GENERATOR_PROMPT } from "../../utils/prompts";
import { RetrievedChunk } from "../vector-store/retriever";
import { getTracer } from '@lmnr-ai/lmnr';

export async function generateWorkflow(message: string, intent: string, predictedNodes: string[], context: RetrievedChunk[]) {
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
Predicted Nodes: ${predictedNodes.join(", ")}

Technical Context (Available Node Documentation):
${contextString}

Generate a complete, valid n8n workflow JSON based on this context.
  `.trim();

  const { text } = await generateText({
    model: google(process.env.WORKFLOW_MODEL || "gemini-2.5-flash"),
    system: WORKFLOW_GENERATOR_PROMPT,
    prompt: fullPrompt,
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'workflow_generator',
      tracer: getTracer()
    }
  });

  // Extract JSON block if the model wraps it in markdown
  const jsonMatch = text.match(/```(?:json)?\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0].replace(/^```(?:json)?\n/, '').replace(/\n```$/, '') : text;
  
  try {
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error("Failed to parse workflow JSON:", text);
    throw new Error("Model failed to output valid JSON.");
  }
}
