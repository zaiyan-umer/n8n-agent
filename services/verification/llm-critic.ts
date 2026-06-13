import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";
import { LLM_CRITIC_PROMPT } from "../../utils/prompts";
import { getTracer } from '@lmnr-ai/lmnr';

export async function verifyWithCritic(intent: string, workflowJson: any) {
  const prompt = `
User Intent: ${intent}

Generated Workflow JSON:
${JSON.stringify(workflowJson, null, 2)}

Review the workflow above. Does it perfectly solve the user's intent? Are there any logical flaws or missing required nodes?
  `.trim();

  const { output } = await generateText({
    model: google(process.env.MODEL_NAME || "gemini-3.1-flash-lite-preview"),
    system: LLM_CRITIC_PROMPT,
    prompt: prompt,
    output: Output.object({
      schema: z.object({
      isApproved: z.boolean().describe("True if the workflow is logically sound and fulfills the intent perfectly. False if there are ANY issues."),
      feedback: z.string().describe("Specific, actionable feedback on what needs to be fixed. If approved, just provide a short confirmation."),
      })
    }),
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'llm_critic',
      tracer: getTracer()
    }
  });

  return output;
}
