import { NextRequest, NextResponse } from "next/server";
import { getConversationsByUserId } from "../../../../../services/dal/conversations.dal";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const userConversations = await getConversationsByUserId(userId);

    return NextResponse.json({ conversations: userConversations }, { status: 200 });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}
