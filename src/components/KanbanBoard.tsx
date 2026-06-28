import React, { useState } from "react";
import { Task } from "../types";
import { TaskItem } from "./TaskItem";

interface KanbanBoardProps {
  tasks: Task[];
  onToggleComplete: (task: Task) => Promise<void>;
  onDelete: (task: Task) => Promise<void>;
  onCreateMeet?: (task: Task) => Promise<void>;
  onCreateGoogleTask?: (task: Task) => Promise<void>;
  onManageRegistration?: (task: Task) => void;
  onUpdateStage: (taskId: string, stage: string) => Promise<void>;
  onClearDone?: () => Promise<void>;
  isSyncing: boolean;
}

const STAGES = [
  { id: "todo", title: "To Do" },
  { id: "in_progress", title: "In Progress" },
  { id: "review", title: "Review" },
  { id: "done", title: "Done" },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  onToggleComplete,
  onDelete,
  onCreateMeet,
  onCreateGoogleTask,
  onManageRegistration,
  onUpdateStage,
  onClearDone,
  isSyncing,
}) => {
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    if (taskId) {
      await onUpdateStage(taskId, targetStage);
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 pt-2">
      {STAGES.map((stage) => {
        const stageTasks = tasks.filter((t) => {
          const effectiveStage = t.completed ? "done" : (t.stage === "done" && !t.completed ? "todo" : (t.stage || "todo"));
          return effectiveStage === stage.id;
        });

        return (
          <div
            key={stage.id}
            className="flex flex-col flex-shrink-0 w-80 bg-natural-bg dark:bg-[#151515] rounded-2xl border border-natural-border shadow-xs overflow-hidden h-fit max-h-[75vh]"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage.id)}
          >
            <div className="p-4 border-b border-natural-border flex items-center justify-between bg-white dark:bg-[#0b0b0c]">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-natural-text-dark text-sm">{stage.title}</h3>
                <span className="bg-natural-accent-light text-natural-accent text-xs font-bold px-2 py-0.5 rounded-full">
                  {stageTasks.length}
                </span>
              </div>
              {stage.id === "done" && stageTasks.length > 0 && onClearDone && (
                <button
                  type="button"
                  onClick={onClearDone}
                  disabled={isSyncing}
                  className="text-[10px] font-bold text-natural-text-secondary hover:text-red-500 uppercase tracking-wide transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>
            
            <div className="p-3 overflow-y-auto flex-1 flex flex-col gap-3 min-h-[150px]">
              {stageTasks.map((task) => (
                <div
                  key={task.id}
                  draggable="true"
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow bg-white rounded-xl overflow-hidden border border-natural-border/60"
                >
                  <TaskItem
                    task={task}
                    onToggleComplete={onToggleComplete}
                    onDelete={onDelete}
                    onCreateMeet={onCreateMeet}
                    onCreateGoogleTask={onCreateGoogleTask}
                    onManageRegistration={onManageRegistration}
                    isSyncing={isSyncing}
                  />
                </div>
              ))}
              {stageTasks.length === 0 && (
                <div className="text-center text-xs text-natural-text-secondary py-8 border-2 border-dashed border-natural-border rounded-xl">
                  Drop tasks here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
