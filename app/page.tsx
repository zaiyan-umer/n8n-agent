"use client";

import { MessageSquare, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useChat } from "@/hooks/useChat";

export default function Home() {
  const {
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
  } = useChat();

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#131314] text-gray-800 dark:text-gray-200 font-sans transition-colors">
      
      {/* Sidebar (Hidden on mobile) */}
      <aside className="w-64 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1E1F20] flex-col hidden md:flex">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <button 
            onClick={() => setIsNewChatModalOpen(true)}
            className="cursor-pointer flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {isConversationsLoading ? (
            <div className="flex justify-center p-4">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : conversations?.length === 0 ? (
            <div className="text-center p-4 text-sm text-gray-500">
              No conversations yet.
            </div>
          ) : (
            <div className="space-y-1">
              {conversations?.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConversationId(conv.id)}
                  className={`cursor-pointer w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center gap-3 text-sm group ${
                    activeConversationId === conv.id 
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <MessageSquare className={`w-4 h-4 transition-colors ${
                    activeConversationId === conv.id ? 'text-blue-500' : 'text-gray-400 group-hover:text-blue-500'
                  }`} />
                  <span className="truncate flex-1 font-medium">
                    {conv.name || "New Conversation"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
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

        {activeConversationId ? (
          <>
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 relative">
              {isMessagesLoading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="max-w-3xl mx-auto flex flex-col space-y-6 pb-4">
                  {messages.length === 0 && (
                    <div className="flex items-center justify-center h-full mt-32">
                      <p className="text-gray-500 dark:text-gray-400 text-lg">Send your first message to begin.</p>
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
              )}
            </main>

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
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
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
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500 dark:text-gray-400">
            <MessageSquare className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600" />
            <h2 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">No Conversation Selected</h2>
            <p className="max-w-md">Select an existing conversation from the sidebar or click "New Chat" to start a new workflow interaction.</p>
          </div>
        )}
      </div>

      <Dialog open={isNewChatModalOpen} onOpenChange={setIsNewChatModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-[#1E1F20] border-gray-200 dark:border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">Create New Conversation</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Conversation Name
              </label>
              <Input
                id="name"
                value={newChatName}
                onChange={(e) => setNewChatName(e.target.value)}
                placeholder="E.g., Bug Fixing Workflow"
                className="bg-transparent border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                autoComplete="off"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newChatName.trim() && !isCreating) {
                    e.preventDefault();
                    handleCreateConversation();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsNewChatModalOpen(false)}
              className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateConversation} 
              disabled={!newChatName.trim() || isCreating}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isCreating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
