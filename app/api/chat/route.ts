import { NextResponse } from 'next/server';
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

    // 1. Parse Intent
    const { intent, predictedNodes, actionType } = await parseIntent(message);

    console.log(intent, predictedNodes, actionType);

    // 2. Vector DB Lookup
    const contextChunks = await retrieveContext(predictedNodes, intent);

    // Self-Correction Loop (Max 3 retries)
    let finalWorkflow = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts && !finalWorkflow) {
      attempts++;

      // 3. Generate Workflow
      const workflowJson = await generateWorkflow(message, intent, predictedNodes, contextChunks);

      console.log(workflowJson);

      return;
      

      // 4. Syntax Verification
      const syntaxCheck = await verifySyntax(workflowJson);
      if (!syntaxCheck.isValid) {
        console.warn(`Attempt ${attempts}: Syntax verification failed.`);
        continue;
      }

      // 5. LLM Critic Verification
      const criticCheck = await verifyWithCritic(intent, workflowJson);
      if (!criticCheck.isApproved) {
        console.warn(`Attempt ${attempts}: Critic verification failed.`);
        continue;
      }

      // Passed all checks
      finalWorkflow = workflowJson;

      // 6. Deploy Workflow
      const deployment = await deployWorkflow(finalWorkflow);
      if (!deployment.success) {
        console.warn(`Attempt ${attempts}: Deployment failed.`);
        finalWorkflow = null;
        continue;
      }
    }

    if (!finalWorkflow) {
      return NextResponse.json({
        role: "assistant",
        content: "I tried to generate a workflow but couldn't verify it after 3 attempts.",
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
