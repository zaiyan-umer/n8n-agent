import { google } from "@ai-sdk/google";
import { Laminar, getTracer } from '@lmnr-ai/lmnr';
import { generateObject } from "ai";
import { z } from "zod";

Laminar.initialize({
  projectApiKey: process.env.LMNR_PROJECT_API_KEY
})

export type HistoryMessage = {
  role: string;
  content: string;
  workflowId?: string;
};

export async function classifyWithLLM(message: string, history: HistoryMessage[]): Promise<'CREATE_NEW' | 'UPDATE_EXISTING'> {
  const messagesArray = history.map(msg => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content
  }));
  messagesArray.push({ role: 'user', content: message });

  const { object } = await generateObject({
    model: google(process.env.GENERAL_MODEL || "gemini-3.1-flash-lite-preview"),
    system: "You are an intelligent workflow intent classifier. Based on the conversation history and the user's latest message, determine if the user wants to CREATE a new workflow, or UPDATE/MODIFY an existing workflow. Respond with 'CREATE_NEW' or 'UPDATE_EXISTING'.",
    messages: messagesArray,
    schema: z.object({
      actionType: z.enum(["CREATE_NEW", "UPDATE_EXISTING"]).describe("Whether to create a new workflow or update an existing one.")
    }),
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'action_classifier',
      tracer: getTracer()
    }
  });

  return object.actionType;
}

export async function classifyAction(message: string, history: HistoryMessage[]): Promise<'CREATE_NEW' | 'UPDATE_EXISTING'> {
  const hasWorkflowInHistory = history.some(m => m.workflowId);

  const updateKeywords = ['update', 'modify', 'change', 'add to', 'remove', 'edit', 'also', 'instead', 'now also'];
  const createKeywords = ['new workflow', 'create', 'build', 'make', 'generate'];

  const lowerMessage = message.toLowerCase();

  // explicit create keywords → always CREATE
  if (createKeywords.some(k => lowerMessage.includes(k))) return 'CREATE_NEW';

  // update keywords + workflow exists in history → UPDATE
  if (updateKeywords.some(k => lowerMessage.includes(k)) && hasWorkflowInHistory) {
    return 'UPDATE_EXISTING';
  }

  // no workflow in history → can only be CREATE
  if (!hasWorkflowInHistory) return 'CREATE_NEW';

  // ambiguous → fallback to LLM
  return classifyWithLLM(message, history);
}
