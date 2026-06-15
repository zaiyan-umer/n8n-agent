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

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (type: string, data: any) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type, ...data })}\n\n`));
          } catch (e) {
            console.error("Failed to enqueue", e);
          }
        };

        try {
          const history = await buildConversationHistory(conversation_id);

          if (conversation_id) {
            await insertMessage({
              conversationId: conversation_id,
              role: "user",
              content: message
            });
          }

          sendEvent('thinking', { message: 'Analyzing request and history...' });
          const actionType = await classifyAction(message, history);

          sendEvent('thinking', { message: `Determined action: ${actionType.replace('_', ' ')}. Parsing required nodes...` });
          let { intent, predictedNodes, suggestedName } = await parseIntent(
            message,
            actionType === 'UPDATE_EXISTING' ? history : [],
            actionType
          );

          sendEvent('thinking', { message: `Intent parsed successfully. Predicted nodes: ${predictedNodes.join(', ')}` });

          if (actionType === 'UPDATE_EXISTING') {
            await handleUpdate({ message, intent, predictedNodes, history, conversation_id, sendEvent });
          } else {
            await handleCreate({ message, intent, predictedNodes, suggestedName, conversation_id, sendEvent });
          }

        } catch (error: any) {
          console.error('Error in pipeline:', error);
          sendEvent('error', { error: error?.message || 'Failed to process request' });
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
