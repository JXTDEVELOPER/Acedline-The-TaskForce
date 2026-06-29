import React, { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, Video, ExternalLink, Check } from "lucide-react";
import { Task } from "../types";
import { TaskForm } from "./TaskForm";
import { OverdueTasksBanner } from "./OverdueTasksBanner";

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
    assigneeEmail?: string,
    workspaceTypeOverride?: "personal" | "team"
  ) => Promise<void>;
  onToggleComplete?: (task: Task) => Promise<void>;
  isSyncing: boolean;
}

export function CalendarDashboard({ tasks, onAddTask, onToggleComplete, isSyncing }: CalendarDashboardProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

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

  const upcomingTasks = tasks
    .filter(t => !t.completed && t.dueDate && new Date(t.dueDate).getTime() >= new Date().setHours(0,0,0,0))
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

  const eventManagementTasks = upcomingTasks.filter(t => t.workspaceType === 'team' || (t.sharedWith && t.sharedWith.length > 0));
  const selfDirectedTasks = upcomingTasks.filter(t => t.workspaceType === 'personal' || !t.workspaceType);

  return (
    <div className="flex-1 overflow-y-auto bg-natural-bg/50 dark:bg-[#151515] p-6 pb-24 rounded-tl-3xl border-t border-l border-natural-border flex flex-col">
      <div className="max-w-7xl mx-auto w-full flex flex-col xl:flex-row gap-6 flex-1">
        
        {/* Main Calendar Section */}
        <div className="flex-1 flex flex-col min-w-0">
          <OverdueTasksBanner tasks={tasks} isSyncing={isSyncing} />
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-1">
                <CalendarIcon className="h-5 w-5" />
                <h2 className="text-xl font-bold text-natural-text-dark">Calendar</h2>
              </div>
              <p className="text-sm text-natural-text-secondary">
                View deadlines and add tasks directly on the calendar.
              </p>
            </div>
            
            <div className="flex items-center gap-4 bg-white/50 dark:bg-[#0b0b0c]/50 backdrop-blur-xl border border-natural-border p-1 rounded-xl shadow-xs">
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

          <div className="flex-1 bg-white/50 dark:bg-[#0b0b0c]/50 backdrop-blur-xl border border-natural-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTask(task);
                        }}
                        className={`text-[10px] px-1.5 py-0.5 rounded border truncate ${getPriorityColor(task.priority)} cursor-pointer`}
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

        {selectedDate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white/50 dark:bg-[#0b0b0c]/50 backdrop-blur-2xl border border-natural-border rounded-2xl shadow-xl w-full max-w-3xl relative flex flex-col max-h-[90vh]">
              <div className="p-4 border-b border-natural-border flex items-center justify-between">
                <h3 className="font-semibold text-sm">Add Task for {format(parseISO(selectedDate), "MMMM d, yyyy")}</h3>
                <button 
                  onClick={() => setSelectedDate(null)}
                  className="text-xs font-medium text-natural-text-secondary hover:text-natural-text-primary p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
              <div className="p-4 overflow-y-auto">
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
            </div>
          </div>
        )}

        {selectedTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white/50 dark:bg-[#0b0b0c]/50 backdrop-blur-2xl border border-natural-border rounded-2xl shadow-xl w-full max-w-md relative flex flex-col max-h-[90vh]">
              <div className="p-4 border-b border-natural-border flex items-center justify-between">
                <h3 className="font-semibold text-lg text-natural-text-dark">{selectedTask.title}</h3>
                <button 
                  onClick={() => setSelectedTask(null)}
                  className="text-xs font-medium text-natural-text-secondary hover:text-natural-text-primary p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
              <div className="p-4 overflow-y-auto space-y-4">
                {selectedTask.description && (
                  <div>
                    <h4 className="text-xs font-semibold text-natural-text-secondary uppercase tracking-wider mb-1">Description</h4>
                    <p className="text-sm text-natural-text-primary whitespace-pre-wrap">{selectedTask.description}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  {selectedTask.dueDate && (
                    <div>
                      <h4 className="text-xs font-semibold text-natural-text-secondary uppercase tracking-wider mb-1">Due Date</h4>
                      <p className="text-sm text-natural-text-primary">{format(parseISO(selectedTask.dueDate), "MMM d, yyyy h:mm a")}</p>
                    </div>
                  )}
                  {selectedTask.priority && (
                    <div>
                      <h4 className="text-xs font-semibold text-natural-text-secondary uppercase tracking-wider mb-1">Priority</h4>
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(selectedTask.priority)}`}>
                        {selectedTask.priority.charAt(0).toUpperCase() + selectedTask.priority.slice(1)}
                      </span>
                    </div>
                  )}
                  {selectedTask.assigneeEmail && (
                    <div className="col-span-2">
                      <h4 className="text-xs font-semibold text-natural-text-secondary uppercase tracking-wider mb-1">Assignee</h4>
                      <p className="text-sm text-natural-text-primary">{selectedTask.assigneeEmail}</p>
                    </div>
                  )}
                  {selectedTask.workspaceType && (
                    <div>
                      <h4 className="text-xs font-semibold text-natural-text-secondary uppercase tracking-wider mb-1">Workspace</h4>
                      <p className="text-sm text-natural-text-primary capitalize">{selectedTask.workspaceType}</p>
                    </div>
                  )}
                </div>

                {/* External Links Section */}
                {(selectedTask.meetLink || selectedTask.googleEventId || selectedTask.googleTaskId) && (
                  <div className="pt-2 border-t border-natural-border">
                    <h4 className="text-xs font-semibold text-natural-text-secondary uppercase tracking-wider mb-2">Links & Integrations</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedTask.meetLink && (
                        <a
                          href={selectedTask.meetLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-medium text-blue-600 transition-all hover:bg-blue-100 active:scale-95 cursor-pointer"
                        >
                          <Video className="h-3.5 w-3.5" />
                          Join Meet
                        </a>
                      )}
                      {selectedTask.googleEventId && (
                        <a
                          href={`https://calendar.google.com/calendar/r/eventedit/${selectedTask.googleEventId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-medium text-indigo-600 transition-all hover:bg-indigo-100 active:scale-95 cursor-pointer"
                        >
                          <CalendarIcon className="h-3.5 w-3.5" />
                          View in Calendar
                        </a>
                      )}
                      {selectedTask.googleTaskId && (
                        <a
                          href="https://mail.google.com/tasks/canvas"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-600 transition-all hover:bg-emerald-100 active:scale-95 cursor-pointer"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          View in Tasks
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {onToggleComplete && (
                <div className="p-4 border-t border-natural-border flex justify-end bg-gray-50 dark:bg-neutral-900 rounded-b-2xl">
                  <button
                    onClick={async () => {
                      if (!isSyncing) {
                        await onToggleComplete(selectedTask);
                        // Update the local selectedTask state to reflect the change immediately
                        setSelectedTask({ ...selectedTask, completed: !selectedTask.completed });
                      }
                    }}
                    disabled={isSyncing}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      selectedTask.completed 
                        ? "bg-natural-panel text-natural-text-primary hover:bg-neutral-200 border border-natural-border dark:hover:bg-neutral-800"
                        : "bg-natural-accent text-white hover:opacity-90 shadow-sm"
                    } disabled:opacity-50`}
                  >
                    <Check className="h-4 w-4" />
                    {selectedTask.completed ? "Mark as Incomplete" : "Mark as Done"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        </div> {/* End of Main Calendar Section */}

        {/* Sidebar Section */}
        <div className="w-full xl:w-[320px] shrink-0 flex flex-col gap-6">
          <div className="bg-white/50 dark:bg-[#0b0b0c]/50 backdrop-blur-xl border border-natural-border rounded-2xl shadow-sm flex flex-col max-h-[500px]">
            <div className="p-4 border-b border-natural-border flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-natural-text-dark">Upcoming Events (Team)</h3>
            </div>
            <div className="p-2 overflow-y-auto flex-1 space-y-2">
              {eventManagementTasks.length === 0 ? (
                <div className="py-6 text-center text-sm text-natural-text-secondary">No upcoming events</div>
              ) : (
                eventManagementTasks.map(task => (
                  <div 
                    key={task.id} 
                    onClick={() => setSelectedTask(task)}
                    className="p-3 rounded-xl border border-natural-border bg-neutral-50/50 hover:bg-neutral-100 cursor-pointer transition-colors"
                  >
                    <h4 className="font-medium text-sm text-natural-text-dark truncate">{task.title}</h4>
                    {task.dueDate && (
                      <p className="text-xs text-natural-text-secondary mt-1">
                        {format(parseISO(task.dueDate), "MMM d, yyyy h:mm a")}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white/50 dark:bg-[#0b0b0c]/50 backdrop-blur-xl border border-natural-border rounded-2xl shadow-sm flex flex-col max-h-[500px]">
            <div className="p-4 border-b border-natural-border flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-natural-text-dark">Self-Directed (Personal)</h3>
            </div>
            <div className="p-2 overflow-y-auto flex-1 space-y-2">
              {selfDirectedTasks.length === 0 ? (
                <div className="py-6 text-center text-sm text-natural-text-secondary">No upcoming tasks</div>
              ) : (
                selfDirectedTasks.map(task => (
                  <div 
                    key={task.id} 
                    onClick={() => setSelectedTask(task)}
                    className="p-3 rounded-xl border border-natural-border bg-neutral-50/50 hover:bg-neutral-100 cursor-pointer transition-colors"
                  >
                    <h4 className="font-medium text-sm text-natural-text-dark truncate">{task.title}</h4>
                    {task.dueDate && (
                      <p className="text-xs text-natural-text-secondary mt-1">
                        {format(parseISO(task.dueDate), "MMM d, yyyy h:mm a")}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
