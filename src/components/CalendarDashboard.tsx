import React, { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus } from "lucide-react";
import { Task } from "../types";
import { TaskForm } from "./TaskForm";

interface CalendarDashboardProps {
  tasks: Task[];
  onAddTask: (
    title: string,
    description: string,
    dueDate?: string,
    addMeet?: boolean,
    addGoogleTask?: boolean,
    registrationFields?: any[],
    priority?: "high" | "medium" | "low",
    assigneeEmail?: string
  ) => Promise<void>;
  isSyncing: boolean;
}

export function CalendarDashboard({ tasks, onAddTask, isSyncing }: CalendarDashboardProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900/50";
      case "medium": return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-900/50";
      case "low": return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900/50";
      default: return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-900/50";
    }
  };

  const tasksByDate = days.reduce((acc, day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    acc[dayStr] = tasks.filter(t => t.dueDate && t.dueDate.startsWith(dayStr) && !t.completed);
    return acc;
  }, {} as Record<string, Task[]>);

  return (
    <div className="flex-1 overflow-y-auto bg-natural-bg/50 dark:bg-[#151515] p-6 pb-24 rounded-tl-3xl border-t border-l border-natural-border flex flex-col">
      <div className="max-w-6xl mx-auto w-full flex flex-col gap-6 flex-1">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-1">
              <CalendarIcon className="h-5 w-5" />
              <h2 className="text-xl font-bold text-natural-text-dark">Calendar</h2>
            </div>
            <p className="text-sm text-natural-text-secondary">
              View deadlines and add tasks directly on the calendar.
            </p>
          </div>
          
          <div className="flex items-center gap-4 bg-white dark:bg-[#0b0b0c] border border-natural-border p-1 rounded-xl shadow-xs">
            <button onClick={handlePrevMonth} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-natural-text-secondary">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-natural-text-dark min-w-[120px] text-center">
              {format(currentDate, "MMMM yyyy")}
            </span>
            <button onClick={handleNextMonth} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-natural-text-secondary">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </header>

        {selectedDate && (
          <div className="mb-6 p-4 bg-white dark:bg-[#0b0b0c] border border-natural-border rounded-2xl shadow-sm relative">
            <button 
              onClick={() => setSelectedDate(null)}
              className="absolute top-4 right-4 text-xs font-medium text-natural-text-secondary hover:text-natural-text-primary"
            >
              Close
            </button>
            <h3 className="font-semibold text-sm mb-4">Add Task for {format(parseISO(selectedDate), "MMMM d, yyyy")}</h3>
            <TaskForm
              onAddTask={async (...args) => {
                await onAddTask(...args);
                setSelectedDate(null);
              }}
              isSyncing={isSyncing}
              workspaceType="personal"
              allowWorkspaceSelection={true}
              initialDate={selectedDate}
            />
          </div>
        )}

        <div className="flex-1 bg-white dark:bg-[#0b0b0c] border border-natural-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="grid grid-cols-7 border-b border-natural-border bg-neutral-50/50 dark:bg-neutral-900/20">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="py-3 text-center text-xs font-semibold text-natural-text-secondary uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 flex-1 auto-rows-[minmax(100px,_1fr)]">
            {days.map((day, idx) => {
              const dayStr = format(day, "yyyy-MM-dd");
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, new Date());
              const dayTasks = tasksByDate[dayStr] || [];

              return (
                <div 
                  key={dayStr}
                  onClick={() => setSelectedDate(dayStr)}
                  className={`
                    border-b border-r border-natural-border/50 p-2 relative group cursor-pointer transition-colors
                    ${!isCurrentMonth ? 'bg-neutral-50/30 dark:bg-neutral-900/10' : 'hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30'}
                    ${idx % 7 === 6 ? 'border-r-0' : ''}
                  `}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`
                      text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full
                      ${isToday ? 'bg-indigo-600 text-white shadow-md' : isCurrentMonth ? 'text-natural-text-dark' : 'text-natural-text-secondary/50'}
                    `}>
                      {format(day, "d")}
                    </span>
                    <Plus className="w-3 h-3 text-natural-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  
                  <div className="flex flex-col gap-1 overflow-y-auto max-h-[80px] no-scrollbar">
                    {dayTasks.map(task => (
                      <div 
                        key={task.id} 
                        className={`text-[10px] px-1.5 py-0.5 rounded border truncate ${getPriorityColor(task.priority)}`}
                        title={task.title}
                      >
                        {task.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
