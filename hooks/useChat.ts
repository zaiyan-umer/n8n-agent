import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { apiClient } from "@/utils/apiClient";

export type Message = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  thinking?: string[];
  isComplete?: boolean;
};

export type Conversation = {
  id: string;
  name: string | null;
};

export function useChat() {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [newChatName, setNewChatName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["authUser"],
    queryFn: async () => {
      const res = await axios.get("/api/auth/me");
      return res.data.user;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: false,
  });

  const { data: conversations, isLoading: isConversationsLoading } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      const res = await axios.get(`/api/users/${user.id}/conversations`);
      return res.data.conversations as Conversation[];
    },
    enabled: !!user?.id,
  });

  const { data: conversationMessages, isLoading: isMessagesLoading } = useQuery({
    queryKey: ["messages", activeConversationId],
    queryFn: async () => {
      const res = await axios.get(`/api/conversations/${activeConversationId}/messages`);
      return res.data.messages as Message[];
    },
    enabled: !!activeConversationId,
  });

  // Sync local message state with the fetched messages when a conversation is selected
  useEffect(() => {
    if (conversationMessages) {
      setMessages(conversationMessages.map(m => ({ ...m, isComplete: true })));
    } else {
      setMessages([]);
    }
  }, [conversationMessages, activeConversationId]);

  const handleCreateConversation = async () => {
    if (!newChatName.trim()) return;
    setIsCreating(true);
    try {
      const res = await axios.post("/api/conversations", { name: newChatName });
      const newConv = res.data.conversation;
      await queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] });
      setActiveConversationId(newConv.id);
      setNewChatName("");
      setIsNewChatModalOpen(false);
    } catch (error) {
      console.error("Failed to create conversation:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !activeConversationId) return;

    const tempId = Date.now().toString();
    const userMessage: Message = { role: "user", content: input };
    const tempAssistantMessage: Message = { id: tempId, role: "assistant", content: "", thinking: [], isComplete: false };

    setMessages((prev) => [...prev, userMessage, tempAssistantMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, conversation_id: activeConversationId })
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          if (part.startsWith("data: ")) {
            const dataStr = part.replace("data: ", "");
            try {
              const data = JSON.parse(dataStr);

              setMessages(prev => prev.map(msg => {
                if (msg.id === tempId) {
                  if (data.type === "thinking") {
                    return { ...msg, thinking: [...(msg.thinking || []), data.message] };
                  } else if (data.type === "message") {
                    return { ...msg, content: data.content, isComplete: true };
                  } else if (data.type === "error") {
                    return { ...msg, content: data.error || "An error occurred.", isComplete: true };
                  }
                }
                return msg;
              }));
            } catch (e) {
              console.error("Failed to parse SSE data", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error calling chat API:", error);
      setMessages((prev) => prev.map(msg => 
        msg.id === tempId 
          ? { ...msg, content: "Sorry, an error occurred while processing your request.", isComplete: true }
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  return {
    user,
    messages,
    input,
    setInput,
    isLoading,
    activeConversationId,
    setActiveConversationId,
    isNewChatModalOpen,
    setIsNewChatModalOpen,
    newChatName,
    setNewChatName,
    isCreating,
    conversations,
    isConversationsLoading,
    isMessagesLoading,
    handleCreateConversation,
    handleSubmit,
  };
}
