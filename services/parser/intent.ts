import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";
import { INTENT_PARSER_PROMPT } from "../../utils/prompts";
import { Laminar, getTracer } from '@lmnr-ai/lmnr'

Laminar.initialize({
  projectApiKey: process.env.LMNR_PROJECT_API_KEY
})

export async function parseIntent(userQuery: string) {
  const { output } = await generateText({
    model: google(process.env.GENERAL_MODEL || "gemini-3.1-flash-lite-preview"),
    system: INTENT_PARSER_PROMPT,
    prompt: userQuery,
    output: Output.object({
      schema: z.object({
        intent: z.string().describe("Faithful restatement of ALL actions, services, conditions, and triggers explicitly mentioned by the user. Never compress or omit."),
        predictedNodes: z.array(z.string()).describe("An array of standard n8n node names required for this workflow."),
        actionType: z.enum(["CREATE_NEW", "UPDATE_EXISTING"]).describe("Whether to create a new workflow or update an existing one."),
        suggestedName: z.string().describe("A short, descriptive name for the workflow based on the intent.")
      })
    }),
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'intent_parser',
      tracer: getTracer()
    }
  });

  return output;
}
