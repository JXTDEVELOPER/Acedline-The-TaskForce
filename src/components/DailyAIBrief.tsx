import React, { useEffect, useState } from 'react';
import { Sparkles, Calendar, FileText, AlertCircle, Clock, CheckCircle2, ChevronRight, Loader2, Zap, RefreshCcw, AlertTriangle } from 'lucide-react';
import { Task } from '../types';
import { AppSettings } from '../hooks/useSettings';
import { useAIAnalysis } from '../hooks/useAIAnalysis';

interface DailyAIBriefProps {
  user: any;
  tasks: Task[];
  calendarEvents: any[];
  settings: AppSettings;
}

export function DailyAIBrief({ user, tasks, calendarEvents, settings }: DailyAIBriefProps) {
  const { data: analysisData, loading, error: errorMsg, refresh } = useAIAnalysis(user, tasks, calendarEvents, settings);
  const [timeSinceUpdate, setTimeSinceUpdate] = useState<string>('Just now');

  useEffect(() => {
    if (!analysisData) return;
    const interval = setInterval(() => {
      const mins = Math.floor((Date.now() - analysisData.lastUpdated) / 60000);
      setTimeSinceUpdate(mins === 0 ? 'Just now' : `${mins} min${mins !== 1 ? 's' : ''} ago`);
    }, 10000);
    return () => clearInterval(interval);
  }, [analysisData]);

  if (loading && !analysisData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-natural-bg dark:bg-[#02050f]">
        <Loader2 className="w-8 h-8 text-natural-accent animate-spin mb-4" />
        <p className="text-natural-text-secondary font-medium animate-pulse">Generating your daily brief...</p>
      </div>
    );
  }

  if (errorMsg && !analysisData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-natural-bg dark:bg-[#02050f]">
        <AlertCircle className="w-8 h-8 text-red-500 mb-4" />
        <p className="text-natural-text-secondary font-medium text-center max-w-md px-4">{errorMsg}</p>
      </div>
    );
  }

  const brief = analysisData ? {
    greeting: analysisData.aiData.greeting,
    proactiveWarning: analysisData.aiData.proactiveWarning,
    summary: {
      meetings: analysisData.metrics.meetings,
      assignments: analysisData.metrics.assignments,
      overdue: analysisData.metrics.overdue,
      freeHours: analysisData.metrics.freeHours
    },
    schedule: analysisData.optimizedSchedule
  } : {
    greeting: `Good morning ${user?.displayName?.split(' ')[0] || 'User'}.`,
    summary: { meetings: 0, assignments: 0, overdue: 0, freeHours: 0 },
    schedule: []
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 h-full flex flex-col bg-neutral-50 dark:bg-neutral-950">
      <div className="max-w-3xl mx-auto w-full space-y-8 animate-fade-in">
        
        {/* Header Greeting */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-natural-accent to-blue-500 flex items-center justify-center shadow-lg shadow-natural-accent/20">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white drop-shadow-sm">
                {brief.greeting}
              </h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 font-medium mt-1 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" /> AI-Generated Briefing
              </p>
            </div>
            {analysisData && (
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500">Last updated: {timeSinceUpdate}</span>
                  <button 
                    onClick={() => refresh()}
                    disabled={loading}
                    title="Force refresh analysis"
                    className={`p-1.5 rounded-lg border border-neutral-200 dark:border-white/10 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:text-white dark:hover:bg-white/10 transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Free Tier API Limit Disclaimer */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3.5 shadow-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-bold">AI Credit Warning:</span> Generating and refreshing AI daily briefs consumes substantial API credits. If you are using a <strong>Free Tier</strong> API key, we recommend limiting unnecessary manual refreshes to avoid credit depletion.
          </div>
        </div>

        {settings.enableProactiveAi && brief.proactiveWarning && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-2xl p-5 shadow-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-amber-900 dark:text-amber-200 text-sm font-medium leading-relaxed">
              {brief.proactiveWarning}
            </p>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Today's Schedule Stats */}
          <div className="bg-white dark:bg-white/5 border border-natural-border dark:border-white/10 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-5 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" /> Today's schedule
            </h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-neutral-700 dark:text-neutral-300 font-medium">
                  <strong className="text-neutral-900 dark:text-white text-lg">{brief.summary.meetings}</strong> meetings
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <span className="text-neutral-700 dark:text-neutral-300 font-medium">
                  <strong className="text-neutral-900 dark:text-white text-lg">{brief.summary.assignments}</strong> assignments
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-neutral-700 dark:text-neutral-300 font-medium">
                  <strong className="text-neutral-900 dark:text-white text-lg">{brief.summary.overdue}</strong> overdue task{brief.summary.overdue !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Free Time Card */}
          <div className="bg-gradient-to-br from-natural-accent/10 to-blue-500/10 border border-natural-accent/20 rounded-2xl p-6 shadow-sm flex flex-col justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Clock className="w-24 h-24 text-natural-accent" />
            </div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-2 relative z-10">You have</h2>
            <div className="text-5xl font-extrabold text-natural-accent drop-shadow-sm mb-2 relative z-10">
              {brief.summary.freeHours}
            </div>
            <p className="text-lg font-medium text-neutral-700 dark:text-neutral-300 relative z-10">
              free hours
            </p>
          </div>
        </div>

        {/* Recommended Schedule */}
        <div className="bg-white dark:bg-white/5 border border-natural-border dark:border-white/10 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-6 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Recommended schedule
          </h2>
          
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-neutral-200 dark:before:via-neutral-700 before:to-transparent">
            {brief.schedule.length > 0 ? (
              brief.schedule.map((item, idx) => (
                <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full border-4 border-white dark:border-neutral-950 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  </div>
                  
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-neutral-50 dark:bg-white/5 border border-neutral-100 dark:border-white/10 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-natural-accent uppercase tracking-wider">{item.timeRange}</span>
                    </div>
                    <h3 className="font-semibold text-neutral-900 dark:text-white text-base">
                      {item.taskName}
                    </h3>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-neutral-500 py-8 relative z-10">No tasks scheduled for today. Enjoy your free time!</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
