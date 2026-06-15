import { NextResponse } from 'next/server';
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
  conversation_id 
}: { 
  message: string, 
  intent: string, 
  predictedNodes: string[], 
  suggestedName: string, 
  conversation_id?: string 
}) {
  // 2. Vector DB Lookup
  let contextChunks = await retrieveContext(predictedNodes, intent);

  // Self-Correction Loop (Max 3 retries)
  let finalWorkflow = null;
  let attempts = 0;
  const maxAttempts = 3;
  let feedback = "";
  let brokenWorkflow: any = null;

  while (attempts < maxAttempts && !finalWorkflow) {
    attempts++;

    // 3. Generate Workflow
    const workflowJson = await generateWorkflow(
      message,
      intent,
      predictedNodes,
      contextChunks,
      feedback,
      brokenWorkflow
    );
    workflowJson.name = suggestedName;
    sanitizeNodeIds(workflowJson);

    // 4. Syntax Verification
    const syntaxCheck = await verifySyntax(workflowJson);
    if (!syntaxCheck.isValid) {
      console.warn(`Attempt ${attempts}: Syntax verification failed. Error: ${syntaxCheck.error}`);
      feedback = `Syntax Error: ${syntaxCheck.error}`;
      brokenWorkflow = workflowJson;
      continue;
    }

    // 5. LLM Critic Verification
    const criticCheck = await verifyWithCritic(intent, message, predictedNodes, workflowJson);
    if (!criticCheck.isApproved) {
      console.warn(`Attempt ${attempts}: Critic verification failed. Feedback: ${criticCheck.feedback}`);
      feedback = `Logic Feedback: ${criticCheck.feedback}`;
      brokenWorkflow = workflowJson;

      if (attempts < maxAttempts) {
        const reparsed = await parseIntent(
          `${message}\n\nPrevious attempt failed. Critic feedback: ${criticCheck.feedback}`
        );
        intent = reparsed.intent;
        predictedNodes = reparsed.predictedNodes;
        contextChunks = await retrieveContext(predictedNodes, reparsed.intent);
      }

      continue;
    }

    // 6. Deploy Workflow
    const deployment = await deployWorkflow(workflowJson);
    if (!deployment.success) {
      console.warn(`Attempt ${attempts}: Deployment failed.`);
      feedback = `Deployment Error: ${deployment.error}. Check node parameter validity.`;
      brokenWorkflow = workflowJson;
      continue;
    }

    finalWorkflow = workflowJson;
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
    return NextResponse.json({
      role: "assistant",
      content: assistantMessageContent,
      ...(process.env.NODE_ENV === 'development' && { debug: { lastWorkflow: brokenWorkflow } })
    });
  }

  if (process.env.NODE_ENV === 'development') {
    require('fs').writeFileSync('debug-workflow.json', JSON.stringify(finalWorkflow, null, 2));
  }

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

  return NextResponse.json({
    role: "assistant",
    content: assistantContent,
    meta: { attempts, workflowId: finalWorkflow.id }
  });
}
