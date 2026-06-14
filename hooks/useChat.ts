import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { apiClient } from "@/utils/apiClient";

export type Message = {
  role: "user" | "assistant";
  content: string;
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
      setMessages(conversationMessages);
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

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await apiClient.post("/chat", { message: input });
      setMessages((prev) => [...prev, response.data]);
    } catch (error) {
      console.error("Error calling chat API:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, an error occurred while processing your request." },
      ]);
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
