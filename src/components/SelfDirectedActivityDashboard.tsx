import React, { useState } from "react";
import { User } from "firebase/auth";
import { GoogleGenAI } from "@google/genai";
import { Target, Send, Loader2 } from "lucide-react";
import Markdown from "react-markdown";

interface Message {
  role: "user" | "model";
  content: string;
}

export function SelfDirectedActivityDashboard({ user }: { user: User }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/productivity-coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: userMessage }],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get response");
      }
      
      setMessages((prev) => [
        ...prev,
        { role: "model", content: data.reply },
      ]);
    } catch (error: any) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { role: "model", content: `Error: ${error.message || "I encountered an error. Please check your Gemini API key in AI Studio settings."}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-10 lg:p-12 h-full flex flex-col">
      <div className="mx-auto max-w-4xl w-full flex-1 flex flex-col h-full min-h-0">
        <header className="mb-8 flex items-center justify-between pb-6 border-b border-natural-border shrink-0">
          <div>
            <h1 className="text-2xl font-light tracking-tight text-natural-text-dark flex items-center gap-2">
              <Target className="h-6 w-6 text-natural-accent" />
              Self-Directed Activity
            </h1>
            <p className="mt-1 text-sm text-natural-text-secondary">
              Productivity coaching and action planning to prevent missed deadlines.
            </p>
          </div>
        </header>

        <div className="flex-1 overflow-hidden flex flex-col bg-white dark:bg-[#0b0b0c] border border-natural-border rounded-2xl shadow-xs">
          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto opacity-70">
                <Target className="h-12 w-12 text-natural-text-secondary mb-4" />
                <h3 className="text-lg font-medium text-natural-text-dark mb-2">Welcome to your Productivity Coach</h3>
                <p className="text-sm text-natural-text-secondary">
                  Ask me "What should I do now?" or share your upcoming tasks, deadlines, and goals. I'll help you prioritize and create actionable steps.
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-5 py-3 ${msg.role === "user" ? "bg-natural-accent text-white" : "bg-neutral-50 dark:bg-neutral-900 border border-natural-border text-natural-text-primary"}`}>
                    <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl px-5 py-3 bg-neutral-50 dark:bg-neutral-900 border border-natural-border text-natural-text-primary flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-natural-text-secondary" />
                  <span className="text-sm text-natural-text-secondary">Analyzing...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-natural-border bg-white dark:bg-[#0b0b0c]">
            <form onSubmit={handleSubmit} className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask 'What should I do now?' or share a task..."
                className="w-full bg-natural-bg border border-natural-border rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-natural-accent/20"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-natural-accent text-white rounded-lg hover:bg-natural-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
