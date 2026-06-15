import { google } from "@ai-sdk/google";
import { Laminar, getTracer } from '@lmnr-ai/lmnr';
import { generateObject, ModelMessage } from "ai";
import { z } from "zod";
import { INTENT_PARSER_PROMPT_CREATE, INTENT_PARSER_PROMPT_UPDATE } from "../../utils/prompts";
import { HistoryMessage } from "./classifier";

Laminar.initialize({
  projectApiKey: process.env.LMNR_PROJECT_API_KEY
})

export async function parseIntent(userQuery: string, history: HistoryMessage[] = [],
  actionType: 'CREATE_NEW' | 'UPDATE_EXISTING' = 'CREATE_NEW') {
  const { object } = await generateObject({
    model: google(process.env.GENERAL_MODEL || "gemini-3.1-flash-lite-preview"),
    system: actionType === 'UPDATE_EXISTING'
      ? INTENT_PARSER_PROMPT_UPDATE
      : INTENT_PARSER_PROMPT_CREATE,

    messages: [
      ...history.map(m => ({ role: m.role, content: m.content }) as ModelMessage),
      { role: "user", content: userQuery }
    ],

    schema: z.object({
      intent: z.string().describe("Faithful restatement of ALL actions, services, conditions, and triggers explicitly mentioned by the user. Never compress or omit."),
      predictedNodes: z.array(z.string()).describe("An array of standard n8n node names required for this workflow."),
      suggestedName: z.string().describe("A short, descriptive name for the workflow based on the intent.")
    }),
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'intent_parser',
      tracer: getTracer()
    }
  });

  return object;
}
