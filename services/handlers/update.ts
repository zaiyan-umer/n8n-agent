import { NextResponse } from 'next/server';
import { insertMessage } from '../dal/messages.dal';

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
