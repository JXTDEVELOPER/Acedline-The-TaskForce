import React from "react";
import { Task } from "../types";
import { TaskItem } from "./TaskItem";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

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
  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    await onUpdateStage(draggableId, destination.droppableId);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex flex-wrap gap-4 pb-4 pt-2 lg:flex-nowrap lg:overflow-x-auto">
        {STAGES.map((stage) => {
          const stageTasks = tasks.filter((t) => {
            const effectiveStage = t.completed ? "done" : (t.stage === "done" && !t.completed ? "todo" : (t.stage || "todo"));
            return effectiveStage === stage.id;
          });

          return (
            <div
              key={stage.id}
              className="flex flex-col bg-natural-bg dark:bg-[#151515] rounded-2xl border border-natural-border shadow-xs overflow-hidden h-fit max-h-[75vh] w-full md:w-[calc(50%-0.5rem)] lg:w-80 flex-shrink-0"
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
              
              <Droppable droppableId={stage.id}>
                {(provided, snapshot) => (
                  <div 
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`p-3 overflow-y-auto flex-1 flex flex-col gap-3 min-h-[150px] transition-colors ${
                      snapshot.isDraggingOver ? "bg-natural-panel/30" : ""
                    }`}
                  >
                    {stageTasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`rounded-xl overflow-hidden border transition-shadow ${
                              snapshot.isDragging 
                                ? "shadow-xl border-natural-accent scale-105 z-50 bg-white" 
                                : "hover:shadow-md border-natural-border/60 bg-white"
                            }`}
                            style={{ ...provided.draggableProps.style }}
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
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {stageTasks.length === 0 && !snapshot.isDraggingOver && (
                      <div className="text-center text-xs text-natural-text-secondary py-8 border-2 border-dashed border-natural-border rounded-xl">
                        Drop tasks here
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
};
