import { NextResponse } from 'next/server';
import { insertMessage } from '../../../services/dal/messages.dal';
import { handleCreate } from '../../../services/handlers/create';
import { handleUpdate } from '../../../services/handlers/update';
import { classifyAction } from '../../../services/parser/classifier';
import { parseIntent } from '../../../services/parser/intent';
import { buildConversationHistory } from '../../../utils/history';



export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, conversation_id } = body;
    
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const history = await buildConversationHistory(conversation_id);

    if (conversation_id) {
      await insertMessage({
        conversationId: conversation_id,
        role: "user",
        content: message
      });
    }

    // 0. Classify Action Type
    const actionType = await classifyAction(message, history);

    // 1. Parse Intent
    let { intent, predictedNodes, suggestedName } = await parseIntent(
      message,
      actionType === 'UPDATE_EXISTING' ? history : [],
      actionType
    );

    if (actionType === 'UPDATE_EXISTING') {
      return handleUpdate({ message, intent, predictedNodes, history, conversation_id });
    }

    return handleCreate({ message, intent, predictedNodes, suggestedName, conversation_id });

  } catch (error) {
    console.error('Error in pipeline:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
