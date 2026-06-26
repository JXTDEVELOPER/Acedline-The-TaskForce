import React, { useState } from "react";
import { User } from "firebase/auth";
import { Target, Send, Loader2, Calendar as CalendarIcon, FileText, Mail, AlertCircle, Clock, Table, StickyNote, GraduationCap, ClipboardList } from "lucide-react";
import Markdown from "react-markdown";
import { Task, getDynamicPriority } from "../types";
import { createGoogleDocWithInstructions, draftEmailWithInstructions, createGoogleSlidesPresentation, createGoogleSheetForTask, createGoogleKeepNote, createGoogleForm, createGoogleClassroom } from "../lib/workspace";

interface Message {
  role: "user" | "model";
  content: string;
}

interface DashboardProps {
  user: User;
  tasks: Task[];
  token: string | null;
  calendarEvents: any[];
  onAddTask: (
    title: string,
    description: string,
    dueDate?: string,
    addMeet?: boolean,
    addGoogleTask?: boolean,
    registrationFields?: any[],
    priority?: "high" | "medium" | "low"
  ) => Promise<void>;
  onFetchCalendarEvents: () => Promise<void>;
}

export function SelfDirectedActivityDashboard({ 
  user, 
  tasks, 
  token,
  calendarEvents,
  onAddTask,
  onFetchCalendarEvents 
}: DashboardProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDrafting, setIsDrafting] = useState<string | null>(null);

  // Filter tasks into priorities (only incomplete tasks)
  const incompleteTasks = tasks.filter(t => !t.completed);
  const highPriority = incompleteTasks.filter(t => getDynamicPriority(t) === "high");
  const mediumPriority = incompleteTasks.filter(t => getDynamicPriority(t) === "medium");
  const lowPriority = incompleteTasks.filter(t => getDynamicPriority(t) === "low");

  // Live Calendar (upcoming 24 hours)
  const now = new Date();
  const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  
  const upcomingEvents = calendarEvents.filter(event => {
    const eventStart = new Date(event.start?.dateTime || event.start?.date);
    return eventStart >= now && eventStart <= next24h;
  });

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

  const handleGenerateActionPlan = async (task: Task, type: 'doc' | 'email' | 'slides' | 'sheet' | 'keep' | 'form' | 'classroom') => {
    if (!token) {
      alert("You need to sign in with Google Workspace scopes to use this feature.");
      return;
    }

    setIsDrafting(task.id);
    try {
      // 1. Get AI Instructions
      const res = await fetch("/api/generate-action-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskTitle: task.title, taskDescription: task.description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate instructions");

      const instructions = data.instructions;

      // 2. Draft using Workspace API
      if (type === 'doc') {
        const url = await createGoogleDocWithInstructions(task.title, instructions, token);
        alert(`Google Doc created successfully! Check your Google Drive or visit:\n${url}`);
        window.open(url, "_blank");
      } else if (type === 'slides') {
        const url = await createGoogleSlidesPresentation(task.title, instructions, token);
        alert(`Google Slides created successfully! Check your Google Drive or visit:\n${url}`);
        window.open(url, "_blank");
      } else if (type === 'sheet') {
        const url = await createGoogleSheetForTask(task.title, token);
        alert(`Google Sheet created successfully! Check your Google Drive or visit:\n${url}`);
        window.open(url, "_blank");
      } else if (type === 'keep') {
        const url = await createGoogleKeepNote(task.title, instructions, token);
        alert(`Keep note created successfully!`);
        window.open(url, "_blank");
      } else if (type === 'form') {
        const url = await createGoogleForm(task.title, token);
        alert(`Google Form created successfully! Check your Google Drive or visit:\n${url}`);
        window.open(url, "_blank");
      } else if (type === 'classroom') {
        const url = await createGoogleClassroom(task.title, token);
        alert(`Google Classroom created successfully! Visit:\n${url}`);
        window.open(url, "_blank");
      } else {
        await draftEmailWithInstructions(task.title, instructions, token);
        alert("Email draft created successfully! Check your Gmail Drafts folder.");
      }
    } catch (error: any) {
      console.error("Action Plan Error:", error);
      alert(`Error generating action plan: ${error.message}`);
    } finally {
      setIsDrafting(null);
    }
  };

  const renderTaskCard = (task: Task, colorClass: string, badgeText: string) => (
    <div key={task.id} className={`p-4 rounded-xl border bg-white ${colorClass} shadow-xs mb-3`}>
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-sm text-gray-900 leading-tight">{task.title}</h4>
        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/50 backdrop-blur-sm border">
          {badgeText}
        </span>
      </div>
      {task.dueDate && (
        <p className="text-xs text-gray-600 flex items-center gap-1 mb-3">
          <Clock className="w-3 h-3" /> {new Date(task.dueDate).toLocaleString()}
        </p>
      )}
      
      <div className="flex flex-wrap gap-2 mt-2 pt-3 border-t border-black/5">
        <button 
          onClick={() => handleGenerateActionPlan(task, 'doc')}
          disabled={isDrafting === task.id}
          className="flex items-center gap-1 text-[10px] font-medium bg-black/5 hover:bg-black/10 text-gray-700 px-2.5 py-1.5 rounded-lg transition-colors"
        >
          {isDrafting === task.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
          AI Doc Plan
        </button>
        <button 
          onClick={() => handleGenerateActionPlan(task, 'email')}
          disabled={isDrafting === task.id}
          className="flex items-center gap-1 text-[10px] font-medium bg-black/5 hover:bg-black/10 text-gray-700 px-2.5 py-1.5 rounded-lg transition-colors"
        >
          {isDrafting === task.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
          AI Email Draft
        </button>
        <button 
          onClick={() => handleGenerateActionPlan(task, 'slides')}
          disabled={isDrafting === task.id}
          className="flex items-center gap-1 text-[10px] font-medium bg-black/5 hover:bg-black/10 text-gray-700 px-2.5 py-1.5 rounded-lg transition-colors"
        >
          {isDrafting === task.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3 text-orange-500" />}
          AI Slides
        </button>
        <button 
          onClick={() => handleGenerateActionPlan(task, 'sheet')}
          disabled={isDrafting === task.id}
          className="flex items-center gap-1 text-[10px] font-medium bg-black/5 hover:bg-black/10 text-gray-700 px-2.5 py-1.5 rounded-lg transition-colors"
        >
          {isDrafting === task.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Table className="w-3 h-3 text-green-600" />}
          AI Sheet
        </button>
        <button 
          onClick={() => handleGenerateActionPlan(task, 'keep')}
          disabled={isDrafting === task.id}
          className="flex items-center gap-1 text-[10px] font-medium bg-black/5 hover:bg-black/10 text-gray-700 px-2.5 py-1.5 rounded-lg transition-colors"
        >
          {isDrafting === task.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <StickyNote className="w-3 h-3 text-yellow-600" />}
          AI Keep
        </button>
        <button 
          onClick={() => handleGenerateActionPlan(task, 'form')}
          disabled={isDrafting === task.id}
          className="flex items-center gap-1 text-[10px] font-medium bg-black/5 hover:bg-black/10 text-gray-700 px-2.5 py-1.5 rounded-lg transition-colors"
        >
          {isDrafting === task.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ClipboardList className="w-3 h-3 text-purple-600" />}
          AI Form
        </button>
        <button 
          onClick={() => handleGenerateActionPlan(task, 'classroom')}
          disabled={isDrafting === task.id}
          className="flex items-center gap-1 text-[10px] font-medium bg-black/5 hover:bg-black/10 text-gray-700 px-2.5 py-1.5 rounded-lg transition-colors"
        >
          {isDrafting === task.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <GraduationCap className="w-3 h-3 text-green-700" />}
          AI Class
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 h-full flex flex-col bg-neutral-50 dark:bg-neutral-950">
      <div className="max-w-7xl mx-auto w-full flex flex-col h-full min-h-0 gap-6">
        
        {/* Header */}
        <header className="shrink-0 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-3">
              <Target className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              Self-Directed Activity
            </h1>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              Prioritize, plan, and execute. Prevent missed deadlines.
            </p>
          </div>
        </header>

        {/* Top Section: Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 shrink-0">
          
          {/* Priorities Board */}
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* High Priority (Red) */}
            <div className="bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 rounded-2xl p-4 flex flex-col max-h-[500px]">
              <h3 className="text-red-800 dark:text-red-400 font-bold mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Immediate Action (High)
              </h3>
              <div className="overflow-y-auto flex-1 pr-1">
                {highPriority.length === 0 ? (
                  <p className="text-xs text-red-600/60 p-4 text-center">No immediate tasks.</p>
                ) : (
                  highPriority.map(task => renderTaskCard(task, "border-red-200 bg-red-50/80 text-red-900", "High"))
                )}
              </div>
            </div>

            {/* Medium Priority (Yellow) */}
            <div className="bg-yellow-50/50 dark:bg-yellow-950/20 border border-yellow-100 dark:border-yellow-900/50 rounded-2xl p-4 flex flex-col max-h-[500px]">
              <h3 className="text-yellow-800 dark:text-yellow-500 font-bold mb-4">
                Upcoming (Medium)
              </h3>
              <div className="overflow-y-auto flex-1 pr-1">
                {mediumPriority.length === 0 ? (
                  <p className="text-xs text-yellow-700/60 p-4 text-center">No medium priority tasks.</p>
                ) : (
                  mediumPriority.map(task => renderTaskCard(task, "border-yellow-200 bg-yellow-50/80 text-yellow-900", "Med"))
                )}
              </div>
            </div>

            {/* Low Priority (Green) */}
            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl p-4 flex flex-col max-h-[500px]">
              <h3 className="text-emerald-800 dark:text-emerald-500 font-bold mb-4">
                Backlog (Low)
              </h3>
              <div className="overflow-y-auto flex-1 pr-1">
                {lowPriority.length === 0 ? (
                  <p className="text-xs text-emerald-700/60 p-4 text-center">No low priority tasks.</p>
                ) : (
                  lowPriority.map(task => renderTaskCard(task, "border-emerald-200 bg-emerald-50/80 text-emerald-900", "Low"))
                )}
              </div>
            </div>
          </div>

          {/* Next 24 Hours Calendar */}
          <div className="bg-white dark:bg-[#111112] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 flex flex-col max-h-[500px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-blue-600" /> Next 24 Hours
              </h3>
            </div>
            <div className="overflow-y-auto flex-1 pr-2 space-y-3">
              {upcomingEvents.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarIcon className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                  <p className="text-xs text-neutral-500">Your schedule is clear for the next 24 hours.</p>
                </div>
              ) : (
                upcomingEvents.map((event, idx) => (
                  <div key={idx} className="border-l-2 border-blue-500 pl-3 py-1">
                    <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 line-clamp-1">{event.summary}</p>
                    <p className="text-[10px] text-neutral-500 mt-0.5">
                      {event.start?.dateTime ? new Date(event.start.dateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'All Day'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Bottom Section: AI Coach */}
        <div className="flex-1 flex flex-col bg-white dark:bg-[#0b0b0c] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xs overflow-hidden min-h-[400px]">
          {/* Chat Header */}
          <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-900 flex items-center gap-2 bg-neutral-50/50 dark:bg-neutral-900/50">
             <Target className="w-5 h-5 text-blue-600" />
             <h3 className="font-bold text-neutral-800 dark:text-neutral-200 text-sm">Productivity Coach</h3>
          </div>
          
          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto opacity-70">
                <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">Need help planning?</h3>
                <p className="text-sm text-neutral-500">
                  Ask me to help you prioritize your tasks or create a step-by-step execution plan.
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-5 py-3 ${msg.role === "user" ? "bg-blue-600 text-white rounded-br-none" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-bl-none"}`}>
                    <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl px-5 py-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 flex items-center gap-2 rounded-bl-none">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Analyzing priorities...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-neutral-100 dark:border-neutral-900 bg-white dark:bg-[#0b0b0c]">
            <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask 'What should I do now?' or share a task..."
                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-full pl-6 pr-14 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
