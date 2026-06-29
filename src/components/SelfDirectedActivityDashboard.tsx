import React, { useState } from "react";
import { User } from "firebase/auth";
import { Target, Send, Loader2, Calendar as CalendarIcon, FileText, Mail, Clock, Table, StickyNote, GraduationCap, ClipboardList, BrainCircuit, ListTodo, Plus, Check } from "lucide-react";
import Markdown from "react-markdown";
import { Task } from "../types";
import { createGoogleDocWithInstructions, draftEmailWithInstructions, createGoogleSlidesPresentation, createGoogleSheetForTask, createGoogleKeepNote, createGoogleForm, createGoogleClassroom } from "../lib/workspace";
import { TaskForm } from "./TaskForm";
import { OverdueTasksBanner } from "./OverdueTasksBanner";

import { AppSettings } from '../hooks/useSettings';

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
    priority?: "high" | "medium" | "low",
    assigneeEmail?: string,
    workspaceTypeOverride?: "personal" | "team"
  ) => Promise<void>;
  onFetchCalendarEvents: () => Promise<void>;
  onSyncGoogleTasks: () => Promise<void>;
  onToggleComplete?: (task: Task) => Promise<void>;
  settings?: AppSettings;
  isSyncing?: boolean;
}

export function SelfDirectedActivityDashboard({ 
  user, 
  tasks, 
  token,
  calendarEvents,
  onAddTask,
  onFetchCalendarEvents,
  onSyncGoogleTasks,
  onToggleComplete,
  settings,
  isSyncing = false
}: DashboardProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDrafting, setIsDrafting] = useState<string | null>(null);
  const [deepThinking, setDeepThinking] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);

  const [emailTopic, setEmailTopic] = useState("");
  const [emailRecipient, setEmailRecipient] = useState("");
  const [isDraftingEmailPanel, setIsDraftingEmailPanel] = useState(false);
  const [emailDraftSuccess, setEmailDraftSuccess] = useState(false);

  const handleDraftEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailTopic.trim() || !token) return;
    setIsDraftingEmailPanel(true);
    setEmailDraftSuccess(false);
    try {
      const response = await fetch("/api/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: emailTopic })
      });
      
      let generatedBody = "";
      if (response.ok) {
         const data = await response.json();
         generatedBody = data.text;
      } else {
        // Fallback or handle error
         generatedBody = `Email draft for: ${emailTopic}\n\nPlease expand on this topic.`;
      }
      
      await draftEmailWithInstructions(emailTopic, generatedBody, token, emailRecipient);
      setEmailDraftSuccess(true);
      setEmailTopic("");
      setEmailRecipient("");
      setTimeout(() => setEmailDraftSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to draft email:", err);
    } finally {
      setIsDraftingEmailPanel(false);
    }
  };

  // Filter tasks into priorities (only incomplete tasks)
  const incompleteTasks = tasks.filter(t => !t.completed);

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
          deepThinking,
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
    <div key={task.id} className={`p-4 rounded-xl border bg-white ${colorClass} shadow-xs mb-3 group`}>
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-sm text-gray-900 leading-tight">{task.title}</h4>
        <div className="flex items-center gap-2">
          {onToggleComplete && (
            <button
              onClick={() => onToggleComplete(task)}
              className="flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
              title="Mark as Done"
            >
              <Check className="w-3 h-3" />
              Done
            </button>
          )}
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/50 backdrop-blur-sm border">
            {badgeText}
          </span>
        </div>
      </div>
      {task.dueDate && (
        <p className="text-xs text-gray-600 flex items-center gap-1 mb-3">
          <Clock className="w-3 h-3" /> {new Date(task.dueDate).toLocaleString()}
        </p>
      )}
      
      <div className="flex flex-wrap gap-2 mt-2 pt-3 border-t border-black/5">
        {settings?.enableAiDocs !== false && (
          <button 
            onClick={() => handleGenerateActionPlan(task, 'doc')}
            disabled={isDrafting === task.id}
            className="flex items-center gap-1 text-[10px] font-medium bg-black/5 hover:bg-black/10 text-gray-700 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            {isDrafting === task.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
            AI Doc Plan
          </button>
        )}
        {settings?.enableAiEmailDrafter !== false && (
          <button 
            onClick={() => handleGenerateActionPlan(task, 'email')}
            disabled={isDrafting === task.id}
            className="flex items-center gap-1 text-[10px] font-medium bg-black/5 hover:bg-black/10 text-gray-700 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            {isDrafting === task.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
            AI Email Draft
          </button>
        )}
        {settings?.enableAiSlides !== false && (
          <button 
            onClick={() => handleGenerateActionPlan(task, 'slides')}
            disabled={isDrafting === task.id}
            className="flex items-center gap-1 text-[10px] font-medium bg-black/5 hover:bg-black/10 text-gray-700 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            {isDrafting === task.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3 text-orange-500" />}
            AI Slides
          </button>
        )}
        {settings?.enableAiSheets !== false && (
          <button 
            onClick={() => handleGenerateActionPlan(task, 'sheet')}
            disabled={isDrafting === task.id}
            className="flex items-center gap-1 text-[10px] font-medium bg-black/5 hover:bg-black/10 text-gray-700 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            {isDrafting === task.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Table className="w-3 h-3 text-green-600" />}
            AI Sheet
          </button>
        )}
        {settings?.enableAiKeep !== false && (
          <button 
            onClick={() => handleGenerateActionPlan(task, 'keep')}
            disabled={isDrafting === task.id}
            className="flex items-center gap-1 text-[10px] font-medium bg-black/5 hover:bg-black/10 text-gray-700 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            {isDrafting === task.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <StickyNote className="w-3 h-3 text-yellow-600" />}
            AI Keep
          </button>
        )}
        {settings?.enableAiForms !== false && (
          <button 
            onClick={() => handleGenerateActionPlan(task, 'form')}
            disabled={isDrafting === task.id}
            className="flex items-center gap-1 text-[10px] font-medium bg-black/5 hover:bg-black/10 text-gray-700 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            {isDrafting === task.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ClipboardList className="w-3 h-3 text-purple-600" />}
            AI Form
          </button>
        )}
        {settings?.enableAiClassroom !== false && (
          <button 
            onClick={() => handleGenerateActionPlan(task, 'classroom')}
            disabled={isDrafting === task.id}
            className="flex items-center gap-1 text-[10px] font-medium bg-black/5 hover:bg-black/10 text-gray-700 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            {isDrafting === task.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <GraduationCap className="w-3 h-3 text-green-700" />}
            AI Class
          </button>
        )}
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
          <div className="flex gap-2">
            <button
              onClick={onSyncGoogleTasks}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors"
            >
              <ClipboardList className="h-4 w-4" />
              Sync from Google Tasks
            </button>
          </div>
        </header>

        {/* Overdue Tasks Banner */}
        <OverdueTasksBanner tasks={tasks} isSyncing={isSyncing} />

        {/* Top Section: Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 shrink-0">
          
          {/* Priorities Board */}
          <div className="lg:col-span-3 bg-white/50 dark:bg-[#111112]/50 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 flex flex-col max-h-[500px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-blue-600" /> All Tasks
              </h3>
              <button
                onClick={() => setIsAddingTask(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-natural-accent text-white rounded-lg hover:bg-natural-accent-hover transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Task
              </button>
            </div>
            <div className="overflow-y-auto flex-1 pr-1">
              {incompleteTasks.length === 0 ? (
                <p className="text-xs text-neutral-500 p-4 text-center">No tasks available.</p>
              ) : (
                incompleteTasks.map(task => {
                  const priority = task.priority || "low";
                  let colorClass = "";
                  let badgeText = "";
                  if (priority === "high") {
                    colorClass = "border-red-200 bg-red-50/80 text-red-900 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400";
                    badgeText = "High";
                  } else if (priority === "medium") {
                    colorClass = "border-yellow-200 bg-yellow-50/80 text-yellow-900 dark:border-yellow-900/50 dark:bg-yellow-900/20 dark:text-yellow-500";
                    badgeText = "Med";
                  } else {
                    colorClass = "border-emerald-200 bg-emerald-50/80 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-500";
                    badgeText = "Low";
                  }
                  return renderTaskCard(task, colorClass, badgeText);
                })
              )}
            </div>
          </div>

          {/* Next 24 Hours Calendar */}
          <div className="bg-white/50 dark:bg-[#111112]/50 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 flex flex-col max-h-[500px]">
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

        {/* Bottom Section: AI Coach and Email Drafter */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[400px]">
          {/* AI Coach */}
          {settings?.enableAiCoach !== false && (
            <div className="flex flex-col bg-white/50 dark:bg-[#0b0b0c]/50 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xs overflow-hidden">
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
              <div className="p-4 border-t border-neutral-100 dark:border-neutral-900 bg-white/50 dark:bg-[#0b0b0c]/50 backdrop-blur-md">
                <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto flex flex-col gap-2">
                  <div className="flex items-center justify-end px-2">
                    <button
                      type="button"
                      onClick={() => setDeepThinking(!deepThinking)}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                        deepThinking
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                          : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                      }`}
                    >
                      <BrainCircuit className="w-3.5 h-3.5" />
                      High Thinking
                    </button>
                  </div>
                  <div className="relative w-full">
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
                  </div>
                </form>
              </div>
            </div>
          )}
          
          {/* Email Drafter */}
          {settings?.enableAiEmailDrafter !== false && (
            <div className="flex flex-col bg-white/50 dark:bg-[#0b0b0c]/50 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-900 flex items-center gap-2 bg-neutral-50/50 dark:bg-neutral-900/50">
                 <Mail className="w-5 h-5 text-indigo-600" />
                 <h3 className="font-bold text-neutral-800 dark:text-neutral-200 text-sm">AI Email Drafter</h3>
              </div>
              <div className="flex-1 p-6 flex flex-col justify-center">
                 <form onSubmit={handleDraftEmail} className="flex flex-col gap-4 max-w-md mx-auto w-full">
                   {emailDraftSuccess && (
                     <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm font-medium flex items-center gap-2">
                       <Check className="w-4 h-4" /> Email saved to drafts!
                     </div>
                   )}
                   <div>
                     <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1 uppercase tracking-wider">Topic / Subject</label>
                     <input
                       type="text"
                       value={emailTopic}
                       onChange={e => setEmailTopic(e.target.value)}
                       placeholder="e.g. Follow up on Project X..."
                       className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all dark:text-white"
                       disabled={isDraftingEmailPanel}
                     />
                   </div>
                   <div>
                     <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1 uppercase tracking-wider">Recipient (Optional)</label>
                     <input
                       type="email"
                       value={emailRecipient}
                       onChange={e => setEmailRecipient(e.target.value)}
                       placeholder="e.g. colleague@example.com"
                       className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all dark:text-white"
                       disabled={isDraftingEmailPanel}
                     />
                   </div>
                   <button
                     type="submit"
                     disabled={!emailTopic.trim() || isDraftingEmailPanel || !token}
                     className="mt-2 w-full flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl py-3 font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     {isDraftingEmailPanel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                     {isDraftingEmailPanel ? "Drafting..." : "Draft Email in Gmail"}
                   </button>
                   {!token && (
                     <p className="text-xs text-red-500 text-center mt-2">
                       You must sign in to use Gmail integrations.
                     </p>
                   )}
                 </form>
              </div>
            </div>
          )}
        </div>

        {isAddingTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white/50 dark:bg-[#0b0b0c]/50 backdrop-blur-2xl border border-natural-border rounded-2xl shadow-xl w-full max-w-3xl relative flex flex-col max-h-[90vh]">
              <div className="p-4 border-b border-natural-border flex items-center justify-between">
                <h3 className="font-semibold text-sm">Add New Task</h3>
                <button 
                  onClick={() => setIsAddingTask(false)}
                  className="text-xs font-medium text-natural-text-secondary hover:text-natural-text-primary p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
              <div className="p-4 overflow-y-auto">
                <TaskForm
                  onAddTask={async (...args) => {
                    await onAddTask(...args);
                    setIsAddingTask(false);
                  }}
                  isSyncing={false}
                  workspaceType="personal"
                  allowWorkspaceSelection={true}
                />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
