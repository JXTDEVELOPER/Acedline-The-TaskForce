import React from "react";
import { Check, Trash2, CalendarDays, ExternalLink, RefreshCw, Video, ListTodo, Sparkles } from "lucide-react";
import { Task, getDynamicPriority } from "../types";

interface TaskItemProps {
  task: Task;
  onToggleComplete: (task: Task) => Promise<void>;
  onDelete: (task: Task) => Promise<void>;
  onCreateMeet?: (task: Task) => Promise<void>;
  onCreateGoogleTask?: (task: Task) => Promise<void>;
  onManageRegistration?: (task: Task) => void;
  isSyncing: boolean;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onToggleComplete,
  onDelete,
  onCreateMeet,
  onCreateGoogleTask,
  onManageRegistration,
  isSyncing,
}) => {
  // Helper to format due dates beautifully
  const formatDueDate = (dateStr: string) => {
    try {
      const isDateTime = dateStr.includes("T");
      const date = new Date(dateStr);
      
      const options: Intl.DateTimeFormatOptions = {
        month: "short",
        day: "numeric",
      };

      if (isDateTime) {
        options.hour = "2-digit";
        options.minute = "2-digit";
      }

      const formatted = date.toLocaleDateString("en-US", options);

      // Simple relative terms
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);

      const isToday = date.toDateString() === today.toDateString();
      const isTomorrow = date.toDateString() === tomorrow.toDateString();

      let prefix = "";
      if (isToday) prefix = "Today";
      else if (isTomorrow) prefix = "Tomorrow";

      if (prefix) {
        if (isDateTime) {
          const timeStr = date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          });
          return `${prefix} at ${timeStr}`;
        }
        return prefix;
      }

      return formatted;
    } catch {
      return dateStr;
    }
  };

  const handleDeleteClick = () => {
    onDelete(task);
  };

  return (
    <div
      id={`task-item-${task.id}`}
      className={`group flex items-start gap-4 border-b border-natural-border bg-white py-4 px-3 transition-all duration-200 hover:bg-natural-panel/40 ${
        task.completed ? "opacity-60" : ""
      }`}
    >
      {/* Checkbox trigger */}
      <button
        id={`toggle-complete-${task.id}`}
        type="button"
        onClick={() => onToggleComplete(task)}
        className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
          task.completed
            ? "border-natural-accent bg-natural-accent text-white"
            : "border-natural-gold bg-transparent text-transparent hover:border-natural-accent hover:text-natural-accent"
        }`}
      >
        <Check className="h-3 w-3 stroke-[2.5]" />
      </button>

      {/* Task description / text content */}
      <div className="flex-1 min-w-0">
        <h3
          className={`text-sm font-medium text-natural-text-dark transition-all duration-300 ${
            task.completed ? "line-through text-natural-text-secondary/80" : ""
          }`}
        >
          {task.title}
        </h3>
        {task.description ? (
          <p
            className={`mt-1 text-xs text-natural-text-primary break-words ${
              task.completed ? "line-through text-natural-text-secondary/50" : ""
            }`}
          >
            {task.description}
          </p>
        ) : null}

        {/* Task badging (Due dates, priority, Meet links, Google Task links, Synced tag) */}
        {(task.dueDate || task.priority || task.googleEventId || task.meetLink || task.googleTaskId || (onCreateMeet && !task.completed) || (onCreateGoogleTask && !task.completed)) ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {(task.priority || task.dueDate) && (() => {
              const dynPri = getDynamicPriority(task);
              return (
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide border ${
                  dynPri === "high" ? "bg-red-50 text-red-600 border-red-200" :
                  dynPri === "medium" ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                  "bg-green-50 text-green-600 border-green-200"
                }`}>
                  {dynPri}
                </span>
              );
            })()}
            {task.dueDate ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-natural-accent-light px-2.5 py-0.5 text-[10px] font-medium text-natural-accent">
                <CalendarDays className="h-3 w-3" />
                {formatDueDate(task.dueDate)}
              </span>
            ) : null}

            {task.meetLink ? (
              <a
                href={task.meetLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[10px] font-medium text-blue-600 transition-all hover:bg-blue-100 active:scale-95 cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              >
                <Video className="h-3 w-3 text-blue-500" />
                Join Google Meet
              </a>
            ) : onCreateMeet && !task.completed ? (
              <button
                id={`add-meet-btn-${task.id}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateMeet(task);
                }}
                disabled={isSyncing}
                title="Create a Google Meet space for this task"
                className="inline-flex items-center gap-1 rounded-full bg-natural-panel border border-natural-border px-2.5 py-0.5 text-[10px] font-medium text-natural-text-secondary transition-all hover:bg-neutral-100 hover:border-gray-400 hover:text-gray-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Video className="h-3 w-3 text-gray-400" />
                + Add Google Meet
              </button>
            ) : null}

            {task.googleTaskId ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-medium text-emerald-600">
                <Check className="h-3 w-3 text-emerald-500" />
                Synced to Tasks
              </span>
            ) : onCreateGoogleTask && !task.completed ? (
              <button
                id={`add-task-btn-${task.id}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateGoogleTask(task);
                }}
                disabled={isSyncing}
                title="Sync this task with Google Tasks"
                className="inline-flex items-center gap-1 rounded-full bg-natural-panel border border-natural-border px-2.5 py-0.5 text-[10px] font-medium text-natural-text-secondary transition-all hover:bg-neutral-100 hover:border-gray-400 hover:text-gray-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <ListTodo className="h-3 w-3 text-gray-400" />
                + Sync to Tasks
              </button>
            ) : null}

            {task.googleEventId ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-natural-panel border border-natural-border px-2.5 py-0.5 text-[10px] font-medium text-[#7D8471]">
                <span className="h-1.5 w-1.5 rounded-full bg-natural-accent animate-pulse" />
                Synced to Calendar
              </span>
            ) : null}

            {onManageRegistration && !task.completed ? (
              <button
                id={`add-reg-btn-${task.id}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onManageRegistration(task);
                }}
                title="Create or manage registration forms using AI"
                className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700 transition-all hover:bg-amber-100 hover:border-amber-400 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Sparkles className="h-3 w-3 text-amber-500 animate-pulse" />
                AI Registration
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Right Column details (Delete action) */}
      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 transition-opacity duration-200 sm:group-hover:opacity-100 focus-within:opacity-100">
        {task.googleEventId ? (
          <a
            href="https://calendar.google.com"
            target="_blank"
            rel="noopener noreferrer"
            title="Open in Google Calendar"
            className="rounded-md p-1.5 text-natural-text-secondary transition-colors duration-200 hover:bg-natural-accent-light hover:text-natural-accent"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : null}
        <button
          id={`delete-btn-${task.id}`}
          onClick={handleDeleteClick}
          title="Delete task"
          className="rounded-md p-1.5 text-natural-text-secondary transition-colors duration-200 hover:bg-natural-accent-light hover:text-red-500"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
