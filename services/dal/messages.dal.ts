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

export const insertMessage = async (data: {
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  workflowId?: string;
  intent?: string;
  predictedNodes?: any;
  actionType?:string;
  attempts?:number
}) => {
  return await db.insert(messages).values(data).returning();
};
