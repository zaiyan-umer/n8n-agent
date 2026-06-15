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
  conversation_id,
  sendEvent
}: {
  message: string,
  intent: string,
  predictedNodes: string[],
  history: any[],
  conversation_id?: string,
  sendEvent: (type: string, data: any) => void
}) {
  const lastAssistantMsg = history
    .filter(m => m.role === 'assistant' && m.workflowId)
    .at(-1);

  if (!lastAssistantMsg?.workflowId) {
    sendEvent('error', { error: 'No previous workflow found to update.' });
    return;
  }

  sendEvent('thinking', { message: 'Fetching existing workflow from n8n...' });
  const currentWorkflow = await fetchWorkflowFromN8n(lastAssistantMsg.workflowId);
  const originalIntent = lastAssistantMsg.intent;

  sendEvent('thinking', { message: 'Retrieving context for modified nodes...' });
  let contextChunks = await retrieveContext(predictedNodes, intent);

  let finalWorkflow = null;
  let attempts = 0;
  let feedback = "Update this existing workflow based on the parsed intent. Keep existing nodes intact unless changes are required.";
  let brokenWorkflow = currentWorkflow;
  const maxAttempts = 3;

  while (attempts < maxAttempts && !finalWorkflow) {
    attempts++;

    sendEvent('thinking', { message: `Attempt ${attempts}: Generating workflow JSON patch...` });
    const workflowJson = await generateWorkflow(
      message,
      intent,
      predictedNodes,
      contextChunks,
      feedback,
      brokenWorkflow
    );

    sanitizeNodeIds(workflowJson);

    sendEvent('thinking', { message: `Attempt ${attempts}: Verifying syntax...` });
    const syntaxCheck = await verifySyntax(workflowJson);
    if (!syntaxCheck.isValid) {
      sendEvent('thinking', { message: `Syntax error found: ${syntaxCheck.error}. Retrying...` });
      feedback = `Syntax Error: ${syntaxCheck.error}`;
      brokenWorkflow = workflowJson;
      continue;
    }

    sendEvent('thinking', { message: `Attempt ${attempts}: Running logic through Critic...` });
    const criticCheck = await verifyWithCritic(
      intent,          // what changed
      message,         // raw user message
      predictedNodes,
      workflowJson,
      originalIntent   // original workflow intent
    );

    if (!criticCheck.isApproved) {
      sendEvent('thinking', { message: `Critic rejected workflow: ${criticCheck.feedback}. Retrying...` });
      feedback = `Logic Feedback: ${criticCheck.feedback}`;
      brokenWorkflow = workflowJson;

      if (attempts < maxAttempts) {
        sendEvent('thinking', { message: `Reparsing intent with critic feedback...` });
        const reparsed = await parseIntent(message, history, 'UPDATE_EXISTING');
        predictedNodes = reparsed.predictedNodes;
        contextChunks = await retrieveContext(reparsed.predictedNodes, reparsed.intent);
      }
      continue;
    }

    // deploy via PUT not POST
    sendEvent('thinking', { message: `Attempt ${attempts}: Deploying update to n8n...` });
    const deployment = await deployWorkflow(workflowJson, lastAssistantMsg.workflowId);
    if (!deployment.success) {
      sendEvent('thinking', { message: `Deployment failed: ${deployment.error}. Retrying...` });
      feedback = `Deployment Error: ${deployment.error}`;
      brokenWorkflow = workflowJson;
      continue;
    }

    finalWorkflow = deployment.data;
  }

  if (!finalWorkflow) {
    const errorMsg = `Failed to update after ${maxAttempts} attempts. Last error: ${feedback}`;
    if (conversation_id) {
      await insertMessage({
        conversationId: conversation_id,
        role: "assistant",
        content: errorMsg
      });
    }
    sendEvent('message', {
      role: "assistant",
      content: errorMsg,
      meta: { error: feedback }
    });
    return;
  }

  const assistantContent = `I understand you wanted to update the workflow. I've successfully modified it based on your request.`;
  
  if (conversation_id) {
    await insertMessage({
      conversationId: conversation_id,
      role: "assistant",
      content: assistantContent,
      intent,
      predictedNodes,
      actionType: 'UPDATE_EXISTING',
      workflowId: finalWorkflow.id
    });
  }

  sendEvent('message', {
    role: "assistant",
    content: assistantContent,
    meta: { attempts, workflowId: finalWorkflow.id }
  });
}