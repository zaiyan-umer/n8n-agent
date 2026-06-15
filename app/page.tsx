"use client";

import { useEffect, useRef } from "react";
import { MessageSquare, Plus, Send, Bot, User, Sparkles } from "lucide-react";
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

  const scrollContainerRef = useRef<HTMLElement>(null);

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  return (
    <div className="flex h-screen bg-[#FAFAFA] dark:bg-[#0A0A0B] text-gray-800 dark:text-gray-200 font-sans transition-colors overflow-hidden">
      
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 dark:bg-blue-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 dark:bg-indigo-600/10 blur-[120px] pointer-events-none" />

      {/* Sidebar (Hidden on mobile) */}
      <aside className="w-72 flex-shrink-0 border-r border-gray-200/50 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-xl flex-col hidden md:flex z-10">
        <div className="p-5 border-b border-gray-200/50 dark:border-white/5">
          <button 
            onClick={() => setIsNewChatModalOpen(true)}
            className="cursor-pointer flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-sm transition-all transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            New Workflow
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {isConversationsLoading ? (
            <div className="flex justify-center p-4">
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : conversations?.length === 0 ? (
            <div className="text-center p-4 text-sm text-gray-500 dark:text-gray-400">
              No workflows yet.
            </div>
          ) : (
            <div className="space-y-1.5">
              {conversations?.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConversationId(conv.id)}
                  className={`cursor-pointer w-full text-left px-3 py-3 rounded-xl transition-all flex items-center gap-3 text-sm group ${
                    activeConversationId === conv.id 
                      ? 'bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-400 shadow-sm border border-gray-100 dark:border-white/5' 
                      : 'hover:bg-white/50 dark:hover:bg-white/5 text-gray-600 dark:text-gray-300 border border-transparent'
                  }`}
                >
                  <MessageSquare className={`w-4 h-4 transition-colors ${
                    activeConversationId === conv.id ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200'
                  }`} />
                  <span className="truncate flex-1 font-medium">
                    {conv.name || "Untitled Workflow"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <header className="flex items-center px-6 py-4 bg-white/50 dark:bg-black/20 backdrop-blur-md border-b border-gray-200/50 dark:border-white/5 z-20">
          <div className="flex items-center gap-2 flex-1">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <h1 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
              n8n Agent AI
            </h1>
          </div>
          {user && (
            <div className="flex items-center gap-3 text-sm font-medium text-gray-600 dark:text-gray-300">
              <span className="hidden sm:inline">{user.email}</span>
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm uppercase text-xs">
                {user.email.charAt(0)}
              </span>
            </div>
          )}
        </header>

        {activeConversationId ? (
          <>
            <main ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 scroll-smooth relative">
              {isMessagesLoading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto flex flex-col space-y-8 pb-32">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full mt-32 space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20 shadow-sm">
                        <Bot className="w-8 h-8 text-indigo-500" />
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">How can I automate your workflow today?</p>
                    </div>
                  )}
                  
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex gap-4 ${
                        msg.role === "user" ? "flex-row-reverse" : "flex-row"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                        msg.role === "user" 
                          ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white" 
                          : "bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-indigo-500"
                      }`}>
                        {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </div>

                      <div
                        className={`max-w-[80%] rounded-2xl px-6 py-4 shadow-sm ${
                          msg.role === "user"
                            ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-tr-none"
                            : "bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-gray-200/50 dark:border-white/5 text-gray-800 dark:text-gray-200 rounded-tl-none"
                        }`}
                      >
                        {msg.role === "assistant" && msg.thinking && msg.thinking.length > 0 && (
                          <div className="mb-4">
                            {!msg.isComplete ? (
                              <div className="space-y-2 pb-4 border-b border-gray-100/50 dark:border-white/5">
                                {msg.thinking.map((thought, i) => (
                                  <div key={i} className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0"></div>
                                    <span className="leading-snug">{thought}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <details className="text-sm text-gray-500 dark:text-gray-400 cursor-pointer pb-3 mb-3 border-b border-gray-100/50 dark:border-white/5 group">
                                <summary className="font-medium hover:text-indigo-600 dark:hover:text-indigo-400 select-none outline-none flex items-center gap-2 transition-colors">
                                  <span className="flex items-center justify-center w-4 h-4 rounded bg-gray-100 dark:bg-zinc-800 group-open:bg-indigo-50 dark:group-open:bg-indigo-900/30">
                                    <Sparkles className="w-2.5 h-2.5" />
                                  </span>
                                  View generation thoughts
                                </summary>
                                <div className="mt-3 pl-3 space-y-1.5 border-l-2 border-indigo-100 dark:border-indigo-900/50">
                                  {msg.thinking.map((thought, i) => (
                                    <div key={i} className="py-0.5 leading-snug">{thought}</div>
                                  ))}
                                </div>
                              </details>
                            )}
                          </div>
                        )}
                        <div className="whitespace-pre-wrap leading-relaxed">
                          {msg.content || (!msg.isComplete && msg.thinking && msg.thinking.length > 0 ? (
                            <div className="flex items-center gap-1 h-6">
                              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                          ) : "")}
                        </div>
                      </div>
                    </div>
                  ))}

                  {isLoading && !messages.find(m => !m.isComplete) && (
                    <div className="flex gap-4 flex-row">
                      <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-indigo-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div className="max-w-[80%] rounded-2xl px-6 py-5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-gray-200/50 dark:border-white/5 shadow-sm rounded-tl-none flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </main>

            {/* Input Dock */}
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-[#FAFAFA] via-[#FAFAFA]/80 to-transparent dark:from-[#0A0A0B] dark:via-[#0A0A0B]/80 z-20 pointer-events-none">
              <div className="max-w-4xl mx-auto pointer-events-auto">
                <form
                  onSubmit={handleSubmit}
                  className="flex items-center bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-2xl p-2 border border-gray-200/50 dark:border-white/10 shadow-lg focus-within:border-indigo-500/50 dark:focus-within:border-indigo-500/50 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isLoading}
                    placeholder="Describe the workflow you want to build or update..."
                    className="flex-1 bg-transparent border-none outline-none px-4 py-3 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="ml-2 p-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-sm disabled:opacity-50 disabled:from-gray-400 disabled:to-gray-500 dark:disabled:from-zinc-700 dark:disabled:to-zinc-800 disabled:cursor-not-allowed transition-all transform active:scale-95 flex items-center justify-center shrink-0"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
                <div className="text-center mt-3">
                  <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 tracking-wide uppercase">
                    AI can make mistakes. Verify important workflows before production.
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500 dark:text-gray-400 relative z-10">
            <div className="w-20 h-20 rounded-3xl bg-white/50 dark:bg-white/5 backdrop-blur-xl border border-gray-200/50 dark:border-white/5 shadow-sm flex items-center justify-center mb-6">
              <Bot className="w-10 h-10 text-indigo-500" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-3 tracking-tight">Ready to Automate</h2>
            <p className="max-w-md text-gray-500 dark:text-gray-400 leading-relaxed">Select an existing workflow from the sidebar or click "New Workflow" to start building with AI.</p>
          </div>
        )}
      </div>

      <Dialog open={isNewChatModalOpen} onOpenChange={setIsNewChatModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-gray-200/50 dark:border-white/10 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">Create New Workflow</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-6">
            <div className="flex flex-col gap-3">
              <label htmlFor="name" className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Workflow Name
              </label>
              <Input
                id="name"
                value={newChatName}
                onChange={(e) => setNewChatName(e.target.value)}
                placeholder="E.g., Salesforce to Slack Sync"
                className="bg-white/50 dark:bg-black/20 border-gray-200 dark:border-white/10 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 py-6"
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
              className="border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateConversation} 
              disabled={!newChatName.trim() || isCreating}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0"
            >
              {isCreating ? "Creating..." : "Create Workflow"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
