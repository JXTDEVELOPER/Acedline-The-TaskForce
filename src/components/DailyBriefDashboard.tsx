import React, { useEffect, useState, useMemo } from 'react';
import { Task } from '../types';
import { useAnalysisEngine } from '../analysis/useAnalysisEngine';
import { CalendarEvent } from '../analysis/types';
import { motion } from 'motion/react';
import { 
  CheckCircle, AlertTriangle, AlertCircle, Clock, Calendar, 
  Activity, Target, Zap, LayoutDashboard 
} from 'lucide-react';

interface DailyBriefDashboardProps {
  tasks: Task[];
  calendarEvents?: any[]; // raw google calendar events
}

export function DailyBriefDashboard({ tasks, calendarEvents = [] }: DailyBriefDashboardProps) {
  const [now, setNow] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const parsedEvents = useMemo<CalendarEvent[]>(() => {
    return calendarEvents.map(e => ({
      id: e.id,
      title: e.summary || "Event",
      startTime: e.start?.dateTime ? new Date(e.start.dateTime) : (e.start?.date ? new Date(e.start.date) : now),
      endTime: e.end?.dateTime ? new Date(e.end.dateTime) : (e.end?.date ? new Date(e.end.date) : now),
      isMeeting: e.attendees && e.attendees.length > 1,
      isFocusBlock: e.summary?.toLowerCase().includes("focus")
    }));
  }, [calendarEvents, now]);

  const {
    loading,
    risk,
    calendarHealth,
    productivity,
    recommendations,
    optimizedSchedule,
    conflicts,
    dashboardMetrics,
    issues = []
  } = useAnalysisEngine(tasks, parsedEvents, now);

  if (loading || !dashboardMetrics) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const getGreeting = () => {
    const hour = now.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const getBriefSummary = () => {
    const pendingTasks = tasks.filter(t => !t.completed).length;
    let text = `${getGreeting()}. You have ${pendingTasks} active tasks. `;
    if (dashboardMetrics.overdueCount > 0) {
      text += `You have ${dashboardMetrics.overdueCount} overdue tasks that need attention. `;
    }
    if (dashboardMetrics.meetingHours > 4) {
      text += `Your calendar is heavily booked with meetings. `;
    } else {
      text += `Your calendar looks manageable. `;
    }
    text += `You currently have ${dashboardMetrics.freeHours} hours of available focus time. `;
    text += `Your productivity score is ${dashboardMetrics.productivityScore}%. `;
    
    if (recommendations.length > 0) {
      text += recommendations[0].reason;
    }
    
    return text;
  };

  const topPriorities = tasks
    .filter(t => !t.completed)
    .sort((a, b) => {
      // Very simple sorting for UI
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (b.priority === 'high' && a.priority !== 'high') return 1;
      if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (a.dueDate) return -1;
      return 1;
    })
    .slice(0, 3);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header section */}
      <div className="bg-white dark:bg-[#111112] rounded-3xl p-8 shadow-sm border border-natural-border dark:border-white/5">
        <h1 className="text-4xl font-bold text-natural-text-primary dark:text-white tracking-tight mb-2">
          {getGreeting()}
        </h1>
        <p className="text-natural-text-secondary dark:text-white/60 font-medium">
          {now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} • {now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
        </p>
        
        <div className="mt-8 bg-natural-accent/5 dark:bg-[#b400ff]/10 rounded-2xl p-6 border border-natural-accent/10 dark:border-[#b400ff]/20">
          <p className="text-lg text-natural-accent-dark dark:text-[#d373ff] leading-relaxed font-medium">
            {getBriefSummary()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {/* Metric Cards */}
        <MetricCard 
          title="Productivity" 
          value={`${dashboardMetrics.productivityScore}%`} 
          subtitle={productivity?.grade} 
          icon={<Activity className="w-5 h-5" />} 
          color="indigo" 
        />
        <MetricCard 
          title="Calendar Health" 
          value={`${dashboardMetrics.calendarHealth}%`} 
          subtitle={calendarHealth?.status} 
          icon={<Calendar className="w-5 h-5" />} 
          color="emerald" 
        />
        <MetricCard 
          title="Deadline Risk" 
          value={risk?.category || "Unknown"} 
          subtitle={`Score: ${dashboardMetrics.deadlineRisk}`} 
          icon={<Target className="w-5 h-5" />} 
          color={risk?.category === 'Critical' || risk?.category === 'High' ? 'rose' : 'emerald'} 
        />
        <MetricCard 
          title="Free Hours" 
          value={dashboardMetrics.freeHours.toString()} 
          subtitle={`${dashboardMetrics.meetingHours}h meetings`} 
          icon={<Clock className="w-5 h-5" />} 
          color="blue" 
        />
        <MetricCard 
          title="Workload" 
          value={dashboardMetrics.workloadLevel} 
          subtitle={`Req. ${dashboardMetrics.requiredHours}h`} 
          icon={<AlertCircle className="w-5 h-5" />} 
          color={dashboardMetrics.workloadLevel === 'Overloaded' ? 'rose' : 'amber'} 
        />
        <MetricCard 
          title="Completion" 
          value={`${Math.round(dashboardMetrics.completionRate)}%`} 
          subtitle={`${tasks.filter(t => t.completed).length}/${tasks.length} Tasks`} 
          icon={<CheckCircle className="w-5 h-5" />} 
          color="indigo" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Priorities & Quick Insights */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white/50 dark:bg-[#111112]/50 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-natural-border dark:border-white/5">
            <h2 className="text-xl font-bold text-natural-text-primary dark:text-white mb-4 flex items-center">
              <Zap className="w-5 h-5 mr-2 text-[#b400ff]" />
              Today's Priorities
            </h2>
            <div className="space-y-3">
              {topPriorities.length > 0 ? topPriorities.map(task => (
                <div key={task.id} className="flex items-center justify-between p-4 rounded-xl border border-natural-border dark:border-white/5 bg-white/30 dark:bg-white/5">
                  <div className="flex flex-col">
                    <span className="font-semibold text-natural-text-primary dark:text-white">{task.title}</span>
                    {task.dueDate && <span className="text-sm text-natural-text-secondary dark:text-white/60">Due: {new Date(task.dueDate).toLocaleDateString()}</span>}
                  </div>
                  <div className="flex gap-2">
                    {task.priority && (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider
                        ${task.priority === 'high' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300' :
                        task.priority === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' :
                        'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'}`}>
                        {task.priority}
                      </span>
                    )}
                  </div>
                </div>
              )) : (
                <p className="text-natural-text-secondary dark:text-white/60">No active tasks for today.</p>
              )}
            </div>
          </div>

          <div className="bg-white/50 dark:bg-[#111112]/50 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-natural-border dark:border-white/5">
            <h2 className="text-xl font-bold text-natural-text-primary dark:text-white mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-blue-500" />
              Quick Insights
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {issues.map((issue, i) => (
                <div key={`issue-${i}`} className={`flex items-center p-3 rounded-xl border ${issue.severity === 'High' ? 'bg-rose-50 border-rose-100 text-rose-800 dark:bg-rose-900/20 dark:border-rose-800/30 dark:text-rose-300' : 'bg-amber-50 border-amber-100 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800/30 dark:text-amber-300'}`}>
                  <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
                  <span className="text-sm font-medium">{issue.description}</span>
                </div>
              ))}
              {issues.length === 0 && (
                <div className="flex items-center p-3 rounded-xl border bg-emerald-50 border-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800/30 dark:text-emerald-300 sm:col-span-2">
                  <CheckCircle className="w-4 h-4 mr-2 shrink-0" />
                  <span className="text-sm font-medium">Your day looks perfectly balanced. You have enough time to finish today's work.</span>
                </div>
              )}
            </div>

            <h2 className="text-xl font-bold text-natural-text-primary dark:text-white mb-4 flex items-center pt-2">
              <LayoutDashboard className="w-5 h-5 mr-2 text-[#b400ff]" />
              Recommendations
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendations.slice(0, 4).map((rec, i) => (
                <div key={i} className="p-4 rounded-xl border border-natural-accent/10 dark:border-[#b400ff]/20 bg-natural-accent/5 dark:bg-[#b400ff]/10">
                  <h3 className="font-semibold text-natural-accent-dark dark:text-white">{rec.reason}</h3>
                  <p className="text-sm text-natural-accent dark:text-white/60 mt-1">{rec.estimatedBenefit}</p>
                </div>
              ))}
              {recommendations.length === 0 && (
                <p className="text-natural-text-secondary dark:text-white/60 col-span-2">No active recommendations. Keep up the good work!</p>
              )}
            </div>
          </div>
        </div>

        {/* Right column: Timeline */}
        <div className="bg-white/50 dark:bg-[#111112]/50 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-natural-border dark:border-white/5">
          <h2 className="text-xl font-bold text-natural-text-primary dark:text-white mb-6 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-emerald-500" />
            Optimized Timeline
          </h2>
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-natural-border dark:before:via-white/10 before:to-transparent">
            {optimizedSchedule?.timeline.slice(0, 8).map((block, i) => (
              <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-6 h-6 rounded-full border-4 border-white dark:border-[#0f111a] bg-emerald-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                </div>
                <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-xl border border-natural-border dark:border-white/5 bg-white/30 dark:bg-white/5 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold uppercase tracking-wider
                      ${block.type === 'Meeting' ? 'text-blue-500' :
                        block.type === 'Focus' ? 'text-indigo-500' :
                        block.type === 'Break' ? 'text-emerald-500' :
                        'text-rose-500'}`}>
                      {block.type}
                    </span>
                    <time className="text-xs font-medium text-natural-text-secondary dark:text-white/60">
                      {block.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </time>
                  </div>
                  <div className="font-medium text-natural-text-primary dark:text-white">
                    {block.title}
                  </div>
                </div>
              </div>
            ))}
            {(!optimizedSchedule || optimizedSchedule.timeline.length === 0) && (
              <div className="text-center text-natural-text-secondary dark:text-white/60 relative z-10 bg-transparent py-4">
                No scheduled blocks available for today.
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Conflicts section if any */}
      {conflicts.length > 0 && (
        <div className="bg-rose-50 dark:bg-rose-900/20 rounded-3xl p-6 border border-rose-100 dark:border-rose-800/30">
          <h2 className="text-xl font-bold text-rose-900 dark:text-rose-200 mb-4 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Detected Conflicts ({conflicts.length})
          </h2>
          <div className="space-y-3">
            {conflicts.map((c, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-[#111112] rounded-xl border border-rose-100 dark:border-rose-800/50">
                <span className="font-medium text-rose-800 dark:text-rose-300">{c.reason}</span>
                <span className="text-sm text-rose-600 dark:text-rose-400 mt-1 sm:mt-0">{c.suggestedFix}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ title, value, subtitle, icon, color }: { title: string, value: string, subtitle?: string, icon: React.ReactNode, color: 'indigo' | 'emerald' | 'rose' | 'blue' | 'amber' }) {
  const colorMap = {
    indigo: 'bg-[#b400ff]/10 text-[#b400ff] dark:bg-[#b400ff]/20 dark:text-[#d373ff]',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  };

  return (
    <div className="bg-white dark:bg-[#111112] rounded-3xl p-6 shadow-sm border border-natural-border dark:border-white/5 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-natural-text-secondary dark:text-white/60">{title}</h3>
        <div className={`p-2 rounded-xl ${colorMap[color]}`}>
          {icon}
        </div>
      </div>
      <div className="mt-auto">
        <div className="text-3xl font-bold text-natural-text-primary dark:text-white">
          {value}
        </div>
        {subtitle && (
          <div className="text-sm font-medium text-natural-text-secondary dark:text-white/60 mt-1">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
