import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";
import { LLM_CRITIC_PROMPT } from "../../utils/prompts";
import { getTracer } from '@lmnr-ai/lmnr';

export async function verifyWithCritic(intent: string, originalQuery: string, predictedNodes: string[], workflowJson: any, originalIntent?: string) {
  let prompt = `
ORIGINAL REQUEST: ${originalQuery}
PARSED INTENT: ${intent}
PREDICTED NODES: ${predictedNodes.join(", ")}
(Note: PREDICTED NODES is just a helpful roadmap. Do NOT reject the workflow simply because it uses different nodes, as long as it logically fulfills the original request).
`;

  if (originalIntent) {
    prompt += `
ORIGINAL WORKFLOW INTENT (Before Update): ${originalIntent}
NOTE: The user is UPDATING an existing workflow. Ensure the final workflow still fulfills the ORIGINAL WORKFLOW INTENT while also incorporating the new PARSED INTENT changes.
`;
  }

  prompt += `
If they conflict, ORIGINAL REQUEST takes priority.

Generated Workflow JSON:
${JSON.stringify(workflowJson, null, 2)}

Review the workflow above. Does it perfectly solve the user's intent? Are there any logical flaws or missing required nodes?
  `.trim();

  const { output } = await generateText({
    model: google(process.env.CRITIC_MODEL || "gemini-2.5-flash"),
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
