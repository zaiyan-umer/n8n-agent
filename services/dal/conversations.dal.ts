import { eq, desc } from "drizzle-orm";
import { db } from "../../db/connection";
import { conversations } from "../../db/schema/conversations";

export const getConversationsByUserId = async (userId: string) => {
  return await db
    .select({
      id: conversations.id,
      name: conversations.name,
    })
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.createdAt));
};
