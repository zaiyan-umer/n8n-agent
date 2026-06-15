import { retrieveContext } from '../vector-store/retriever';
import { generateWorkflow } from '../generator/workflow';
import { sanitizeNodeIds } from '../../utils/sanitize';
import { verifySyntax } from '../verification/syntax';
import { verifyWithCritic } from '../verification/llm-critic';
import { parseIntent } from '../parser/intent';
import { deployWorkflow } from '../deployment/deploy';
import { insertMessage } from '../dal/messages.dal';

export async function handleCreate({ 
  message, 
  intent, 
  predictedNodes, 
  suggestedName, 
  conversation_id,
  sendEvent
}: { 
  message: string, 
  intent: string, 
  predictedNodes: string[], 
  suggestedName: string, 
  conversation_id?: string,
  sendEvent: (type: string, data: any) => void
}) {
  sendEvent('thinking', { message: 'Retrieving context for predicted nodes...' });
  let contextChunks = await retrieveContext(predictedNodes, intent);

  // Self-Correction Loop (Max 3 retries)
  let finalWorkflow = null;
  let attempts = 0;
  const maxAttempts = 3;
  let feedback = "";
  let brokenWorkflow: any = null;

  while (attempts < maxAttempts && !finalWorkflow) {
    attempts++;

    sendEvent('thinking', { message: `Attempt ${attempts}: Generating workflow JSON...` });
    const workflowJson = await generateWorkflow(
      message,
      intent,
      predictedNodes,
      contextChunks,
      feedback,
      brokenWorkflow,
      sendEvent
    );
    workflowJson.name = suggestedName;
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
    const criticCheck = await verifyWithCritic(intent, message, predictedNodes, workflowJson);
    if (!criticCheck.isApproved) {
      sendEvent('thinking', { message: `Critic rejected workflow: ${criticCheck.feedback}. Retrying...` });
      feedback = `Logic Feedback: ${criticCheck.feedback}`;
      brokenWorkflow = workflowJson;

      if (attempts < maxAttempts) {
        sendEvent('thinking', { message: `Reparsing intent with critic feedback...` });
        const reparsed = await parseIntent(
          `${message}\n\nPrevious attempt failed. Critic feedback: ${criticCheck.feedback}`
        );
        intent = reparsed.intent;
        predictedNodes = reparsed.predictedNodes;
        contextChunks = await retrieveContext(predictedNodes, reparsed.intent);
      }

      continue;
    }

    sendEvent('thinking', { message: `Attempt ${attempts}: Deploying to n8n...` });
    const deployment = await deployWorkflow(workflowJson);
    if (!deployment.success) {
      sendEvent('thinking', { message: `Deployment failed: ${deployment.error}. Retrying...` });
      feedback = `Deployment Error: ${deployment.error}. Check node parameter validity.`;
      brokenWorkflow = workflowJson;
      continue;
    }

    finalWorkflow = deployment.data;
  }

  if (!finalWorkflow) {
    const assistantMessageContent = `Failed after ${maxAttempts} attempts. Last error: ${feedback}`;
    if (conversation_id) {
      await insertMessage({
        conversationId: conversation_id,
        role: "assistant",
        content: assistantMessageContent
      });
    }
    sendEvent('message', {
      role: "assistant",
      content: assistantMessageContent,
      meta: { error: feedback }
    });
    return;
  }

  if (process.env.NODE_ENV === 'development') {
    require('fs').writeFileSync('debug-workflow.json', JSON.stringify(finalWorkflow, null, 2));
  }

  sendEvent('thinking', { message: 'Workflow deployed successfully! Finalizing...' });
  const assistantContent = `I've successfully generated your workflow '${suggestedName}'!`;
  
  if (conversation_id) {
    await insertMessage({
      conversationId: conversation_id,
      role: "assistant",
      content: assistantContent,
      workflowId: finalWorkflow.id,
      intent,
      predictedNodes,
      actionType: 'CREATE_NEW',
      attempts,
    });
  }

  sendEvent('message', {
    role: "assistant",
    content: assistantContent,
    meta: { attempts, workflowId: finalWorkflow.id }
  });
}
