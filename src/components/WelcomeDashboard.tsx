import React, { useState } from 'react';
import { Target, GraduationCap, CalendarDays, Columns, Settings, PenTool, Sparkles, PlusCircle, X, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

import { getCached, setCached } from "../lib/cache";

interface WelcomeDashboardProps {
  user: any;
  tasks: any[];
  setActiveView: (view: any) => void;
  todayFormatted: string;
}

export function WelcomeDashboard({ user, tasks, setActiveView, todayFormatted }: WelcomeDashboardProps) {
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
  const [aiBrief, setAiBrief] = useState("");
  const [showBriefModal, setShowBriefModal] = useState(false);

  const pendingTasksCount = tasks.filter(t => !t.completed).length;
  const completedTasksCount = tasks.filter(t => t.completed).length;
  
  const chartData = [
    { name: 'Completed', value: completedTasksCount, color: '#10b981' }, // Emerald 500
    { name: 'Pending', value: pendingTasksCount, color: '#f43f5e' } // Rose 500
  ];

  const handleGenerateBrief = async () => {
    setIsGeneratingBrief(true);
    setShowBriefModal(true);
    setAiBrief("");
    try {
      const pendingTasks = tasks.filter(t => !t.completed);
      const cacheKey = `ai-brief-${pendingTasks.map(t => t.id).join('-')}`;
      let brief = getCached<string>(cacheKey);

      if (!brief) {
        const res = await fetch("/api/generate-ai-brief", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pendingTasks })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to generate brief");
        brief = data.text;
        if (brief) setCached(cacheKey, brief);
      }
      setAiBrief(brief as string);
    } catch (e: any) {
      setAiBrief(`Error generating brief: ${e.message}`);
    } finally {
      setIsGeneratingBrief(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-10 lg:p-12">
      <div className="mx-auto max-w-4xl">
        <header className="mb-10 pb-6 border-b border-natural-border flex justify-between items-end">
          <div>
            <div className="font-mono text-[10px] tracking-widest text-[#A09489] font-bold">
              {todayFormatted}
            </div>
            <h1 className="mt-2 text-4xl font-light tracking-tight text-natural-text-dark">
              Welcome back, {user?.displayName?.split(' ')[0] || 'User'}
            </h1>
            <p className="mt-2 text-natural-text-secondary text-lg">
              You have <span className="font-semibold text-natural-accent">{pendingTasksCount}</span> pending tasks across your workspaces.
            </p>
          </div>
          <button
            onClick={handleGenerateBrief}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#b400ff]/10 text-[#b400ff] hover:bg-[#b400ff]/20 transition-colors font-medium text-sm"
          >
            <Bot className="h-4 w-4" />
            AI Brief
          </button>
        </header>

        {/* Task Progress Section */}
        <div className="bg-white dark:bg-[#0b0b0c] p-6 rounded-2xl border border-natural-border shadow-sm mb-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-natural-text-dark mb-2">Weekly Progress Overview</h2>
            <p className="text-natural-text-secondary text-sm mb-4">
              Here's a quick look at your task completion ratio. Stay productive!
            </p>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-sm font-medium text-natural-text-dark">{completedTasksCount} Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                <span className="text-sm font-medium text-natural-text-dark">{pendingTasksCount} Pending</span>
              </div>
            </div>
          </div>
          <div className="w-40 h-40">
            {tasks.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#1f2937', fontWeight: 500 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-natural-text-secondary">
                No tasks yet
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {/* Quick Actions / AI Functions Highlight */}
          <div className="bg-white dark:bg-[#0b0b0c] p-6 rounded-2xl border border-natural-border shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-[#b400ff]" />
                <h2 className="text-xl font-semibold text-natural-text-dark">AI Capabilities</h2>
              </div>
              <p className="text-natural-text-secondary text-sm mb-4 leading-relaxed">
                Supercharge your workflow with AI. Automatically generate forms, draft emails, and extract insights from your tasks. 
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-sm text-natural-text-dark">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#b400ff]" />
                  <span><strong>AI Form Generator:</strong> Instantly create Google Forms for event registrations.</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-natural-text-dark">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#b400ff]" />
                  <span><strong>Smart Task Autofill:</strong> AI evaluates priority and context automatically.</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-natural-text-dark">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#b400ff]" />
                  <span><strong>WhatsApp Reminders:</strong> Get instant alerts for high-priority critical tasks.</span>
                </li>
              </ul>
            </div>
            <button 
              onClick={() => setActiveView("settings")}
              className="mt-6 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-natural-accent/10 text-natural-accent font-medium hover:bg-natural-accent/20 transition-colors"
            >
              <Settings className="h-4 w-4" />
              Configure AI Settings
            </button>
          </div>

          <div className="bg-white dark:bg-[#0b0b0c] p-6 rounded-2xl border border-natural-border shadow-sm">
            <h2 className="text-xl font-semibold text-natural-text-dark mb-4">Quick Access</h2>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setActiveView("event-management")}
                className="flex flex-col items-start p-4 rounded-xl border border-natural-border hover:border-natural-accent hover:bg-natural-accent/5 transition-all text-left"
              >
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg mb-3">
                  <CalendarDays className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="font-semibold text-natural-text-dark text-sm">Event Management</span>
                <span className="text-xs text-natural-text-secondary mt-1">Manage team events</span>
              </button>
              
              <button 
                onClick={() => setActiveView("classroom")}
                className="flex flex-col items-start p-4 rounded-xl border border-natural-border hover:border-natural-accent hover:bg-natural-accent/5 transition-all text-left"
              >
                <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg mb-3">
                  <GraduationCap className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <span className="font-semibold text-natural-text-dark text-sm">Classroom Tracker</span>
                <span className="text-xs text-natural-text-secondary mt-1">Sync coursework</span>
              </button>

              <button 
                onClick={() => setActiveView("self-directed")}
                className="flex flex-col items-start p-4 rounded-xl border border-natural-border hover:border-natural-accent hover:bg-natural-accent/5 transition-all text-left"
              >
                <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg mb-3">
                  <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="font-semibold text-natural-text-dark text-sm">Self-Directed</span>
                <span className="text-xs text-natural-text-secondary mt-1">Personal habits</span>
              </button>

              <button 
                onClick={() => setActiveView("boards")}
                className="flex flex-col items-start p-4 rounded-xl border border-natural-border hover:border-natural-accent hover:bg-natural-accent/5 transition-all text-left"
              >
                <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-lg mb-3">
                  <Columns className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <span className="font-semibold text-natural-text-dark text-sm">Kanban Boards</span>
                <span className="text-xs text-natural-text-secondary mt-1">Visual workflow</span>
              </button>
            </div>
          </div>
        </div>

      </div>
      
      <AnimatePresence>
        {showBriefModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#0b0b0c] border border-natural-border p-6 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-[#b400ff]" />
                  <h3 className="text-xl font-semibold text-natural-text-dark">AI Brief</h3>
                </div>
                <button 
                  onClick={() => setShowBriefModal(false)}
                  className="text-natural-text-secondary hover:text-natural-text-dark transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto mb-4">
                {isGeneratingBrief ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-natural-text-secondary">
                    <Sparkles className="h-8 w-8 text-[#b400ff] animate-pulse" />
                    <p className="text-sm">Analyzing your tasks...</p>
                  </div>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-natural-text-dark">
                    <Markdown>{aiBrief}</Markdown>
                  </div>
                )}
              </div>
              
              {!isGeneratingBrief && (
                <div className="pt-4 border-t border-natural-border flex gap-3 flex-col sm:flex-row">
                  <button 
                    onClick={() => {
                      setShowBriefModal(false);
                      setActiveView("self-directed");
                    }}
                    className="flex-1 bg-[#b400ff] text-white rounded-xl py-2 font-medium text-sm hover:bg-[#a000e6] transition-colors"
                  >
                    Need an Action Plan? Go to AI Coach
                  </button>
                  <button 
                    onClick={() => setShowBriefModal(false)}
                    className="flex-1 bg-natural-panel border border-natural-border text-natural-text-dark rounded-xl py-2 font-medium text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    Close
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
