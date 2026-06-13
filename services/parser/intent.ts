import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";
import { INTENT_PARSER_PROMPT } from "../../utils/prompts";
import {Laminar, getTracer} from '@lmnr-ai/lmnr'

Laminar.initialize({
  projectApiKey: process.env.LMNR_PROJECT_API_KEY
})

export async function parseIntent(message: string) {
  const { output } = await generateText({
    model: google(process.env.GENERAL_MODEL || "gemini-3.1-flash-lite-preview"),
    system: INTENT_PARSER_PROMPT,
    prompt: message,
    output: Output.object({
      schema: z.object({
        intent: z.string().describe("A clear, summarized description of the user's goal."),
        predictedNodes: z.array(z.string()).describe("An array of standard n8n node names required for this workflow."),
        actionType: z.enum(["CREATE_NEW", "UPDATE_EXISTING"]).describe("Whether to create a new workflow or update an existing one."),
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
