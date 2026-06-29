import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, ArrowRight, Calendar, CheckCircle2, Clock, Loader2, Sparkles, XCircle, Zap, ShieldAlert, RefreshCcw, Bot } from 'lucide-react';
import { Task } from '../types';
import { AppSettings } from '../hooks/useSettings';
import { useCalendarAnalyzer } from '../hooks/useCalendarAnalyzer';

interface CalendarAnalyzerDashboardProps {
  user: any;
  tasks: Task[];
  calendarEvents: any[];
  settings: AppSettings;
  updateTasks: (tasks: Task[]) => void;
}

export function CalendarAnalyzerDashboard({ user, tasks, calendarEvents, settings, updateTasks }: CalendarAnalyzerDashboardProps) {
  const { data, loading, error, analyze } = useCalendarAnalyzer(user, tasks, calendarEvents, settings);
  const [applying, setApplying] = useState(false);
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);

  const [timeSinceUpdate, setTimeSinceUpdate] = useState<string>('Just now');

  useEffect(() => {
    analyze();
  }, [analyze]);

  useEffect(() => {
    if (!data?.lastUpdated) return;
    const interval = setInterval(() => {
      const mins = Math.floor((Date.now() - data.lastUpdated!) / 60000);
      setTimeSinceUpdate(mins === 0 ? 'Just now' : `${mins} min${mins !== 1 ? 's' : ''} ago`);
    }, 10000);
    // Initial update
    const mins = Math.floor((Date.now() - data.lastUpdated) / 60000);
    setTimeSinceUpdate(mins === 0 ? 'Just now' : `${mins} min${mins !== 1 ? 's' : ''} ago`);
    
    return () => clearInterval(interval);
  }, [data?.lastUpdated]);

  const applyOptimizedPlan = async () => {
    setApplying(true);
    // In a full implementation, this would call Google Calendar/Tasks APIs and update internal state
    // For now, we simulate a successful application
    setTimeout(() => {
      setApplying(false);
      setShowApplyConfirm(false);
      // We would refresh data here or update local state
    }, 1500);
  };

  if (loading && !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-natural-bg dark:bg-[#02050f]">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <p className="text-natural-text-secondary font-medium animate-pulse">Analyzing schedule & workload...</p>
      </div>
    );
  }

  if (!data || error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-natural-bg dark:bg-[#02050f]">
        <AlertTriangle className="w-8 h-8 text-red-500 mb-4" />
        <p className="text-natural-text-secondary font-medium">{error || "Failed to load analysis."}</p>
        <button onClick={() => analyze(true)} className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">Retry</button>
      </div>
    );
  }

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-emerald-500";
    if (score >= 60) return "text-amber-500";
    return "text-red-500";
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 h-full flex flex-col bg-neutral-50 dark:bg-neutral-950">
      <div className="max-w-6xl mx-auto w-full space-y-8 animate-fade-in">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white drop-shadow-sm">
                AI Calendar Analyzer
              </h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 font-medium mt-1 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" /> Continuous Schedule Optimization
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500 font-medium hidden sm:inline-block">Last updated: {timeSinceUpdate}</span>
              <button 
                onClick={() => analyze(true)}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                Refresh Analysis
              </button>
            </div>
          </div>
        </div>

        {/* Free Tier API Limit Disclaimer */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3.5 shadow-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-bold">AI Credit Warning:</span> Generating and refreshing AI calendar optimizations consumes substantial API credits. If you are using a <strong>Free Tier</strong> API key, we recommend limiting unnecessary manual refreshes to avoid credit depletion.
          </div>
        </div>

        {/* AI Insights */}
        {data.insights.length > 0 && (
          <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800/30 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-purple-800 dark:text-purple-300 font-semibold">
              <Bot className="w-5 h-5" /> AI Productivity Insights
            </div>
            {data.insights.map((insight, idx) => (
              <p key={idx} className="text-purple-900 dark:text-purple-200 text-sm leading-relaxed flex items-start gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                {insight}
              </p>
            ))}
          </div>
        )}

        {/* Top Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
            <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">Calendar Health</p>
            <div className={`text-4xl font-bold mt-2 ${getHealthColor(data.healthScore)}`}>{data.healthScore}</div>
            <p className="text-xs text-neutral-400 mt-1">/100 Overall Score</p>
          </div>
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
            <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">Free Hours</p>
            <div className="text-4xl font-bold mt-2 text-neutral-900 dark:text-white">{data.metrics.freeHours}h</div>
            <p className="text-xs text-neutral-400 mt-1">vs {data.metrics.requiredHours}h required</p>
          </div>
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
            <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">Meeting Time</p>
            <div className="text-4xl font-bold mt-2 text-neutral-900 dark:text-white">{data.metrics.meetingTime}h</div>
            <p className="text-xs text-neutral-400 mt-1">Scheduled today</p>
          </div>
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
            <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">Deadline Risk</p>
            <div className={`text-4xl font-bold mt-2 ${getHealthColor(100 - data.metrics.deadlineRiskScore)}`}>{data.metrics.deadlineRiskScore}%</div>
            <p className="text-xs text-neutral-400 mt-1">Miss probability</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Detected Issues */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500" /> Detected Issues
            </h2>
            <div className="space-y-4">
              {data.issues.length === 0 ? (
                <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/30 rounded-2xl p-6 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
                  <p className="text-emerald-800 dark:text-emerald-300 font-medium">Your schedule is perfectly optimized!</p>
                </div>
              ) : (
                data.issues.map(issue => (
                  <div key={issue.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
                    <div className={`absolute top-0 left-0 w-1 h-full ${issue.severity === 'high' ? 'bg-red-500' : issue.severity === 'medium' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                    <div className="pl-3">
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-neutral-900 dark:text-white text-base">{issue.title}</h3>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider ${
                          issue.severity === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 
                          issue.severity === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 
                          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}>
                          {issue.severity} Risk
                        </span>
                      </div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">{issue.explanation}</p>
                      
                      <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                        <p className="text-xs text-neutral-500 uppercase font-semibold tracking-wider mb-1">Recommendation</p>
                        <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{issue.recommendedAction}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Optimized Plan Preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-500" /> Optimized Schedule
              </h2>
              <button 
                onClick={() => setShowApplyConfirm(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                Apply Plan
              </button>
            </div>
            
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-1 overflow-hidden shadow-sm">
              <div className="space-y-0.5">
                {data.optimizedSchedule.map((item, idx) => {
                  let bgColor, icon;
                  switch(item.type) {
                    case 'deep_work': bgColor = 'bg-purple-50 dark:bg-purple-900/20'; icon = <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />; break;
                    case 'meeting': bgColor = 'bg-blue-50 dark:bg-blue-900/20'; icon = <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />; break;
                    case 'break': bgColor = 'bg-emerald-50 dark:bg-emerald-900/20'; icon = <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />; break;
                    case 'task': bgColor = 'bg-neutral-50 dark:bg-neutral-800/50'; icon = <CheckCircle2 className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />; break;
                    default: bgColor = 'bg-transparent'; icon = <Activity className="w-4 h-4 text-neutral-400" />;
                  }

                  return (
                    <div key={idx} className={`flex items-stretch ${bgColor} p-3 group hover:bg-opacity-80 transition-colors`}>
                      <div className="w-24 shrink-0 flex flex-col justify-center border-r border-neutral-200 dark:border-neutral-700/50 pr-3">
                        <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">{item.timeRange.split('–')[0]}</span>
                        <span className="text-xs text-neutral-500">{item.timeRange.split('–')[1]}</span>
                      </div>
                      <div className="flex-1 pl-4 flex items-center gap-3">
                        {icon}
                        <span className="text-sm font-medium text-neutral-900 dark:text-white">{item.activity}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Confirmation Modal */}
      {showApplyConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111112] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl max-w-md w-full p-6 animate-scale-up">
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Apply Optimized Plan?</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
              This will update your Google Calendar and rearrange your task schedule based on the AI recommendations.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowApplyConfirm(false)}
                disabled={applying}
                className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
              >
                Cancel
              </button>
              <button 
                onClick={applyOptimizedPlan}
                disabled={applying}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
              >
                {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {applying ? 'Applying...' : 'Confirm & Apply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
