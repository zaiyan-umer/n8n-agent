import { NextResponse } from 'next/server';
import { insertMessage } from '../../../services/dal/messages.dal';
import { deployWorkflow } from '../../../services/deployment/deploy';
import { generateWorkflow } from '../../../services/generator/workflow';
import { parseIntent } from '../../../services/parser/intent';
import { retrieveContext } from '../../../services/vector-store/retriever';
import { verifyWithCritic } from '../../../services/verification/llm-critic';
import { verifySyntax } from '../../../services/verification/syntax';
import { sanitizeNodeIds } from '../../../utils/sanitize';



export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, conversation_id } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (conversation_id) {
      await insertMessage({
        conversationId: conversation_id,
        role: "user",
        content: message
      });
    }

    // 1. Parse Intent
    let { intent, predictedNodes, actionType, suggestedName } = await parseIntent(message);

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

      // 4. Syntax Verification — re-parse intent won't help here, just retry generator
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

        // Re-run intent parser with critic feedback as context
        // Anchor to original message so intent never drifts
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

      // 6. Deploy Workflow — only set finalWorkflow after confirmed success
      const deployment = await deployWorkflow(workflowJson);
      if (!deployment.success) {
        console.warn(`Attempt ${attempts}: Deployment failed.`);
        feedback = `Deployment Error: ${deployment.error}. Check node parameter validity.`;
        brokenWorkflow = workflowJson;
        continue;
      }

      finalWorkflow = workflowJson; // only set here
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
        actionType,
        attempts,
      });
    }

    return NextResponse.json({
      role: "assistant",
      content: assistantContent,
      meta: { attempts, workflowId: finalWorkflow.id }
    });

  } catch (error) {
    console.error('Error in pipeline:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
