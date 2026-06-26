import React, { useState } from "react";
import { Plus, Calendar, Clock, Sparkles, Video, ListTodo } from "lucide-react";
import { Task } from "../types";

interface TaskFormProps {
  onAddTask: (
    title: string,
    description: string,
    dueDate?: string,
    addMeet?: boolean,
    addGoogleTask?: boolean,
    registrationFields?: any[]
  ) => Promise<void>;
  isSyncing: boolean;
}

export const TaskForm: React.FC<TaskFormProps> = ({ onAddTask, isSyncing }) => {
  // Mode selection: manual input vs AI prompt scheduler
  const [mode, setMode] = useState<"manual" | "ai">("manual");
  
  // Manual form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [hasDueDate, setHasDueDate] = useState(false);
  const [dueDateStr, setDueDateStr] = useState("");
  const [dueTimeStr, setDueTimeStr] = useState("");
  const [addMeet, setAddMeet] = useState(false);
  const [addGoogleTask, setAddGoogleTask] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AI assistant states
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "ai") {
      handleComposeWithAI();
      return;
    }
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      let finalDueDate: string | undefined;

      if (hasDueDate && dueDateStr) {
        if (dueTimeStr) {
          // Combine YYYY-MM-DD and HH:HH into ISO component
          finalDueDate = `${dueDateStr}T${dueTimeStr}:00`;
        } else {
          // Store pure date
          finalDueDate = dueDateStr;
        }
      }

      await onAddTask(title.trim(), description.trim(), finalDueDate, addMeet, addGoogleTask);

      // Reset values
      setTitle("");
      setDescription("");
      setDueDateStr("");
      setDueTimeStr("");
      setHasDueDate(false);
      setAddMeet(false);
      setAddGoogleTask(false);
    } catch (err) {
      console.error("Form error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComposeWithAI = async () => {
    if (!aiPrompt.trim() || isAiGenerating) return;

    setIsAiGenerating(true);
    setAiError(null);

    try {
      const res = await fetch("/api/parse-event-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
      });

      if (!res.ok) {
        const errorDetail = await res.json().catch(() => ({}));
        throw new Error(errorDetail.error || "Failed to parse prompt with AI. Please check server logs.");
      }

      const data = await res.json();
      
      // Submit fully parsed parameters to parent creator handler!
      await onAddTask(
        data.title,
        data.description,
        data.dueDate || undefined,
        data.addMeet,
        data.addGoogleTask,
        data.registrationFields || []
      );

      // Clear prompt input box on successful execution!
      setAiPrompt("");
      setMode("manual");
    } catch (err: any) {
      console.error("AI Event parsing failed:", err);
      setAiError(err.message || "An unknown error occurred while communicating with Gemini.");
    } finally {
      setIsAiGenerating(false);
    }
  };

  return (
    <div
      id="task-form-container"
      className="mb-8 rounded-2xl border border-natural-border bg-white p-6 shadow-xs transition-all duration-300 hover:shadow-md"
    >
      {/* Mode Selector Tab Bar */}
      <div className="flex border-b border-natural-border/60 pb-3 mb-5 gap-4 text-xs font-sans">
        <button
          type="button"
          onClick={() => {
            setMode("manual");
            setAiError(null);
          }}
          className={`pb-1 px-1 font-bold border-b-2 cursor-pointer transition-all duration-200 ${
            mode === "manual"
              ? "border-natural-accent text-natural-accent"
              : "border-transparent text-natural-text-secondary hover:text-natural-text-dark"
          }`}
        >
          Standard Task Setup
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("ai");
            setAiError(null);
          }}
          className={`pb-1 px-1 font-bold border-b-2 cursor-pointer transition-all duration-200 flex items-center gap-1.5 ${
            mode === "ai"
              ? "border-natural-accent text-natural-accent"
              : "border-transparent text-natural-text-secondary hover:text-natural-text-dark"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5 text-natural-accent animate-pulse" />
          AI Prompt Scheduler
        </button>
      </div>

      {mode === "ai" ? (
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-natural-text-dark flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-natural-accent" />
              Analyze event details and generate registration forms with AI:
            </label>
            <textarea
              id="ai-event-prompt-textarea"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g., Schedule an expert panel discussion on June 10 at 4pm. Sync a Google Meet link and generate a sign-up form requesting their name, twitter handles, and areas of interest."
              rows={3}
              className="w-full rounded-2xl border border-natural-border p-3.5 text-xs text-natural-text-dark outline-none bg-white transition-all focus:ring-1 focus:ring-natural-accent focus:border-natural-accent resize-none placeholder:text-gray-400"
            />
            
            <p className="text-[10px] text-natural-text-secondary leading-relaxed">
              💡 Gemini parses task fields, dates, links, and builds standard RSVP signup parameters in one continuous flow.
            </p>
          </div>

          {aiError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600">
              {aiError}
            </div>
          )}

          <div className="flex justify-end border-t border-natural-panel pt-4">
            <button
              id="submit-ai-prompt-btn"
              type="button"
              onClick={handleComposeWithAI}
              disabled={isAiGenerating || !aiPrompt.trim()}
              className="flex items-center gap-1.5 rounded-full bg-natural-accent px-4 py-2 text-xs font-semibold text-white tracking-wide shadow-xs hover:bg-natural-accent-hover transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isAiGenerating ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border border-neutral-300 border-t-white" />
                  <span>Configuring Workspace with Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                  <span>Compose Event & Form</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-4">
            {/* Title Input */}
            <div>
              <input
                id="task-title-input"
                type="text"
                required
                placeholder="Create a new task..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border-0 border-b border-transparent bg-transparent py-1 text-lg font-medium text-natural-text-dark placeholder-natural-text-secondary/60 focus:border-natural-accent/30 focus:outline-hidden"
              />
            </div>

            {/* Optional Description */}
            <div>
              <textarea
                id="task-description-textarea"
                placeholder="Detail notes (optional)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={1}
                className="w-full resize-none border-0 bg-transparent text-sm text-natural-text-primary placeholder-natural-text-secondary/40 focus:outline-hidden focus:ring-0"
              />
            </div>

            {/* Due Date Details */}
            {hasDueDate ? (
              <div
                id="deadline-fields"
                className="flex flex-col sm:flex-row gap-3 rounded-lg bg-natural-panel border border-natural-border/60 p-3"
              >
                {/* Date Picker */}
                <div className="flex flex-1 items-center gap-2">
                  <Calendar className="h-4 w-4 text-natural-text-secondary" />
                  <input
                    id="due-date-picker"
                    type="date"
                    required
                    value={dueDateStr}
                    onChange={(e) => setDueDateStr(e.target.value)}
                    className="w-full bg-transparent text-xs text-natural-text-primary focus:outline-hidden"
                  />
                </div>

                {/* Optional Time Picker */}
                <div className="flex flex-1 items-center gap-2 border-t border-natural-border pt-2 sm:border-t-0 sm:border-l sm:pl-3 sm:pt-0">
                  <Clock className="h-4 w-4 text-natural-text-secondary" />
                  <input
                    id="due-time-picker"
                    type="time"
                    value={dueTimeStr}
                    placeholder="Add specific time"
                    onChange={(e) => setDueTimeStr(e.target.value)}
                    className="w-full bg-transparent text-xs text-natural-text-primary focus:outline-hidden"
                  />
                </div>
              </div>
            ) : null}

            {/* Actions bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between border-t border-natural-panel pt-4">
              <div className="flex flex-wrap gap-2">
                <button
                  id="toggle-deadline-btn"
                  type="button"
                  onClick={() => setHasDueDate(!hasDueDate)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                    hasDueDate
                      ? "bg-natural-accent text-white"
                      : "bg-natural-accent-light text-natural-text-primary hover:bg-natural-border"
                  }`}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  {hasDueDate ? "Remove Deadline" : "Add Deadline & Sync"}
                </button>

                <button
                  id="toggle-meet-btn"
                  type="button"
                  onClick={() => setAddMeet(!addMeet)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                    addMeet
                      ? "bg-blue-600 text-white"
                      : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                  }`}
                >
                  <Video className="h-3.5 w-3.5" />
                  {addMeet ? "Google Meet Added" : "Add Google Meet"}
                </button>

                <button
                  id="toggle-tasks-btn"
                  type="button"
                  onClick={() => setAddGoogleTask(!addGoogleTask)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                    addGoogleTask
                      ? "bg-emerald-600 text-white"
                      : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                  }`}
                >
                  <ListTodo className="h-3.5 w-3.5" />
                  {addGoogleTask ? "Google Task Added" : "Sync Google Task"}
                </button>
              </div>

              <button
                id="submit-task-btn"
                type="submit"
                disabled={!title.trim() || isSubmitting}
                className="flex items-center justify-center gap-1.5 rounded-full bg-natural-accent px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all duration-250 hover:bg-natural-accent-hover focus:ring-2 focus:ring-natural-border disabled:bg-natural-accent-light disabled:text-natural-text-secondary/40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="h-3 w-3 animate-spin rounded-full border border-neutral-300 border-t-white" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                Add Task
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
