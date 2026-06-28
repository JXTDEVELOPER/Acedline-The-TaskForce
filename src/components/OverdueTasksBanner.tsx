import React, { useState } from "react";
import { Task } from "../types";
import { AlertTriangle, Sparkles } from "lucide-react";

interface OverdueTasksBannerProps {
  tasks: Task[];
  isSyncing: boolean;
}

export function OverdueTasksBanner({ tasks, isSyncing }: OverdueTasksBannerProps) {
  const overdueTasks = tasks.filter(
    (t) => !t.completed && t.dueDate && new Date(t.dueDate).getTime() < new Date().setHours(0, 0, 0, 0)
  );
  const [prompt, setPrompt] = useState("");

  if (overdueTasks.length === 0) return null;

  return (
    <div className="bg-red-50/80 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl p-4 mb-6 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-red-800 dark:text-red-400">
        <AlertTriangle className="h-5 w-5" />
        <h3 className="font-bold text-sm">You have {overdueTasks.length} overdue task(s)</h3>
      </div>
      
      <div className="flex flex-wrap gap-2 mb-1">
        {overdueTasks.map((t) => (
          <div
            key={t.id}
            className="bg-white dark:bg-[#151515] px-2.5 py-1 rounded-md text-xs font-medium text-red-800 dark:text-red-300 shadow-sm border border-red-100 dark:border-red-900/30 truncate max-w-[200px]"
            title={t.title}
          >
            {t.title}
          </div>
        ))}
      </div>

      <div className="bg-white/60 dark:bg-[#111]/60 rounded-xl p-2 border border-red-100 dark:border-red-900/30 flex gap-2 items-center">
        <input
          type="text"
          placeholder="Ask AI to help reschedule or manage these tasks..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isSyncing}
          className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-sm px-2 text-red-900 dark:text-red-200 placeholder:text-red-400 dark:placeholder:text-red-500/50"
        />
        <button
          type="button"
          disabled={isSyncing || !prompt.trim()}
          className="bg-red-600 text-white rounded-lg px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Prompt AI
        </button>
      </div>
    </div>
  );
}
