import { NextResponse } from 'next/server';
import { sanitizeNodeIds } from '../../../utils/sanitize';
import { deployWorkflow } from '../../../services/deployment/deploy';
import { generateWorkflow } from '../../../services/generator/workflow';
import { parseIntent } from '../../../services/parser/intent';
import { retrieveContext } from '../../../services/vector-store/retriever';
import { verifyWithCritic } from '../../../services/verification/llm-critic';
import { verifySyntax } from '../../../services/verification/syntax';



export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // 1. Parse Intent
    const { intent, predictedNodes, actionType, suggestedName } = await parseIntent(message);

    // 2. Vector DB Lookup
    const contextChunks = await retrieveContext(predictedNodes, intent);

    // Self-Correction Loop (Max 3 retries)
    let finalWorkflow = null;
    let attempts = 0;
    const maxAttempts = 3;
    let feedback = "";
    let brokenWorkflow: any = null;

    while (attempts < maxAttempts && !finalWorkflow) {
      attempts++;

      // 3. Generate Workflow
      const workflowJson = await generateWorkflow(message, intent, predictedNodes, contextChunks, feedback, brokenWorkflow);
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
        continue;
      }

      // Passed all checks
      finalWorkflow = workflowJson;

      // 6. Deploy Workflow
      const deployment = await deployWorkflow(finalWorkflow);

      if (!deployment.success) {
        console.warn(`Attempt ${attempts}: Deployment failed.`);
        feedback = `Deployment Error: ${deployment.error}. Check node parameter validity.`;
        brokenWorkflow = workflowJson;
        continue;
      }
    }

    if (!finalWorkflow) {
      return NextResponse.json({
        role: "assistant",
        content: `Failed after ${maxAttempts} attempts. Last error: ${feedback}`,
        debug: { lastWorkflow: brokenWorkflow }
      });
    }

    // Return the successful workflow response
    return NextResponse.json({
      role: "assistant",
      content: `I have successfully wired the pipeline and generated your workflow!\n\n\`\`\`json\n${JSON.stringify(finalWorkflow, null, 2)}\n\`\`\``,
    });
    
  } catch (error) {
    console.error('Error in pipeline:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
