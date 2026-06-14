import { NextRequest, NextResponse } from "next/server";
import { getMessagesByConversationId } from "../../../../../services/dal/messages.dal";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params;

    if (!conversationId) {
      return NextResponse.json({ error: "Conversation ID is required" }, { status: 400 });
    }

    const conversationMessages = await getMessagesByConversationId(conversationId);

    return NextResponse.json({ messages: conversationMessages }, { status: 200 });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
