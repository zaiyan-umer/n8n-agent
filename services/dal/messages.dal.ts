import { eq, asc } from "drizzle-orm";
import { db } from "../../db/connection";
import { messages } from "../../db/schema/messages";

export const getMessagesByConversationId = async (conversationId: string) => {
  return await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));
};
