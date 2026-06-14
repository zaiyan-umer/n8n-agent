"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { apiClient } from "../utils/apiClient";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch the current user on mount and cache it for 5 minutes
  const { data: user, isLoading: isUserLoading } = useQuery({
    queryKey: ["authUser"],
    queryFn: async () => {
      const res = await axios.get("/api/auth/me");
      return res.data.user;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 5 * 60 * 1000,
    retry: false, // Don't retry if the user is unauthenticated (e.g. 401)
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

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

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-[#131314] text-gray-800 dark:text-gray-200 font-sans transition-colors">
      {/* Header */}
      <header className="flex items-center px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1E1F20]">
        <h1 className="text-xl font-semibold bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent flex-1">
          AI Assistant
        </h1>
        {user && (
          <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300">
            <span className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20 uppercase">
              {user.email.charAt(0)}
            </span>
            <span className="hidden sm:inline">{user.email}</span>
          </div>
        )}
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
        <div className="max-w-3xl mx-auto flex flex-col space-y-6 pb-4">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full mt-32">
              <p className="text-gray-500 dark:text-gray-400 text-lg">Start a conversation by typing a message below.</p>
            </div>
          )}
          
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-5 py-3 ${
                  msg.role === "user"
                    ? "bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-100 rounded-br-none"
                    : "bg-white dark:bg-[#1E1F20] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-800 shadow-sm rounded-bl-none"
                }`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">
                  {msg.content}
                </p>
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl px-5 py-4 bg-white dark:bg-[#1E1F20] border border-gray-200 dark:border-gray-800 shadow-sm rounded-bl-none flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Input Area */}
      <footer className="p-4 sm:p-6 bg-white dark:bg-[#1E1F20] border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={handleSubmit}
            className="flex items-center bg-gray-100 dark:bg-[#282A2C] rounded-full px-4 py-2 border border-gray-200 dark:border-gray-700 shadow-sm hover:border-blue-400 dark:hover:border-blue-500 transition-colors focus-within:border-blue-500 dark:focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              placeholder="Ask anything..."
              className="flex-1 bg-transparent border-none outline-none px-4 py-2 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="ml-2 p-2.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-all transform active:scale-95 flex items-center justify-center min-w-[44px] min-h-[44px]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-5 h-5"
              >
                <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
              </svg>
            </button>
          </form>
          <div className="text-center mt-3">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              AI can make mistakes. Verify important information.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
