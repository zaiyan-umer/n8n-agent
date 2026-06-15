import { getMessagesByConversationId } from "../services/dal/messages.dal";
import { HistoryMessage } from "../services/parser/classifier";

export async function buildConversationHistory(conversationId: string | undefined): Promise<HistoryMessage[]> {
  if (!conversationId) return [];

  const allMessages = await getMessagesByConversationId(conversationId, 5);
  return allMessages.map(m => ({ 
    role: m.role, 
    content: m.content,
    workflowId: m.workflowId || undefined
  }));
}
