import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";
import { WORKFLOW_GENERATOR_PROMPT } from "../../utils/prompts";
import { RetrievedChunk } from "../vector-store/retriever";
import { getTracer } from '@lmnr-ai/lmnr';

export async function generateWorkflow(message: string, intent: string, predictedNodes: string[], context: RetrievedChunk[], feedback?: string, previousWorkflow?: any) {
  // Format the retrieved technical documentation for the LLM prompt
  const contextString = context
    .map((c) => {
      const operationStr = c.operation ? ` | Operation: ${c.operation} (${c.operationLabel || "N/A"})` : "";
      return `--- NODE: ${c.displayName} (${c.nodeType})${operationStr} ---\n${c.chunkText}`;
    })
    .join("\n\n");

  let fullPrompt = `
User Message: ${message}
Parsed Intent: ${intent}
Predicted Nodes: ${predictedNodes.join(", ")}

Technical Context (Available Node Documentation):
${contextString}
`;

  if (feedback && previousWorkflow) {
    fullPrompt += `\nPREVIOUS ATTEMPT FEEDBACK:\nThe previous workflow you generated failed with the following error. You must PATCH the JSON below rather than starting from scratch.

CRITICAL HINT: If the error mentions a disconnected node, verify that your "connections" object keys EXACTLY match the target node's "name" field character-for-character.

ERROR:
${feedback}

BROKEN JSON TO FIX:
${JSON.stringify(previousWorkflow, null, 2)}
`;
  } else if (feedback) {
    fullPrompt += `\nPREVIOUS ATTEMPT FEEDBACK:\nThe previous workflow you generated failed with the following error. You must fix this issue:\n${feedback}\n`;
  }

  fullPrompt += `\nGenerate a complete, valid n8n workflow JSON based on this context.`.trim();

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
