import { NextResponse } from 'next/server';
import { insertMessage } from '../dal/messages.dal';
import { sanitizeNodeIds } from '@/utils/sanitize';
import { verifySyntax } from '../verification/syntax';
import { verifyWithCritic } from '../verification/llm-critic';
import { parseIntent } from '../parser/intent';
import { generateWorkflow } from '../generator/workflow';
import { retrieveContext } from '../vector-store/retriever';
import { deployWorkflow, fetchWorkflowFromN8n } from '../deployment/deploy';

export async function handleUpdate({
  message,
  intent,
  predictedNodes,
  history,
  conversation_id
}: {
  message: string,
  intent: string,
  predictedNodes: string[],
  history: any[],
  conversation_id?: string
}) {
  const assistantContent = `I understand you want to update the workflow. I'm preparing to modify it...`;


  const lastAssistantMsg = history
    .filter(m => m.role === 'assistant' && m.workflowId)
    .at(-1);

  if (!lastAssistantMsg?.workflowId) {
    return NextResponse.json({
      error: 'No previous workflow found to update.'
    }, { status: 400 });
  }

  const currentWorkflow = await fetchWorkflowFromN8n(lastAssistantMsg.workflowId);
  const originalIntent = lastAssistantMsg.intent;

  let contextChunks = await retrieveContext(predictedNodes, intent);


  let finalWorkflow = null;
  let attempts = 0;
  let feedback = "Update this existing workflow based on the parsed intent. Keep existing nodes intact unless changes are required.";
  let brokenWorkflow = currentWorkflow;
  const maxAttempts = 3;


  while (attempts < maxAttempts && !finalWorkflow) {
    attempts++;

    const workflowJson = await generateWorkflow(
      message,
      intent,
      predictedNodes,
      contextChunks,
      feedback,
      brokenWorkflow
    );

    sanitizeNodeIds(workflowJson);

    const syntaxCheck = await verifySyntax(workflowJson);
    if (!syntaxCheck.isValid) {
      feedback = `Syntax Error: ${syntaxCheck.error}`;
      brokenWorkflow = workflowJson;
      continue;
    }

    const criticCheck = await verifyWithCritic(
      intent,          // what changed
      message,         // raw user message
      predictedNodes,
      workflowJson,
      originalIntent   // original workflow intent
    );

    if (!criticCheck.isApproved) {
      feedback = `Logic Feedback: ${criticCheck.feedback}`;
      brokenWorkflow = workflowJson;

      if (attempts < maxAttempts) {
        const reparsed = await parseIntent(message, history, 'UPDATE_EXISTING');
        predictedNodes = reparsed.predictedNodes;
        contextChunks = await retrieveContext(reparsed.predictedNodes, reparsed.intent);
      }
      continue;
    }

    // deploy via PUT not POST
    const deployment = await deployWorkflow(workflowJson, lastAssistantMsg.workflowId);
    if (!deployment.success) {
      feedback = `Deployment Error: ${deployment.error}`;
      brokenWorkflow = workflowJson;
      continue;
    }

    finalWorkflow = deployment.data;
  }

  if (conversation_id) {
    await insertMessage({
      conversationId: conversation_id,
      role: "assistant",
      content: assistantContent,
      intent,
      predictedNodes,
      actionType: 'UPDATE_EXISTING',
    });
  }

  return NextResponse.json({
    role: "assistant",
    content: assistantContent,
    meta: {}
  });
} 