import { Task } from '../types';
import { AppSettings } from '../hooks/useSettings';

export interface LocalAnalysis {
  metrics: {
    meetings: number;
    assignments: number;
    overdue: number;
    freeHours: number;
    requiredHours: number;
    meetingTime: number;
    deepWorkTime: number;
    idleTime: number;
    conflictCount: number;
    deadlineRiskScore: number;
    optimizationScore: number;
  };
  healthScore: number;
  productivityScore: number;
  issues: any[];
  optimizedSchedule: any[];
}

export function computeLocalAnalysis(tasks: Task[], calendarEvents: any[], settings: AppSettings): LocalAnalysis {
  const activeTasks = tasks.filter(t => !t.completed);
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  
  // Basic counts
  const assignments = activeTasks.length;
  let overdue = 0;
  let requiredHours = 0;

  activeTasks.forEach(task => {
    if (task.dueDate && task.dueDate < todayStr) overdue++;
    // Estimate 1 hour per task if no explicit duration exists, or derive from priority
    let est = 1;
    if (task.priority === 'high') est = 2;
    if (task.priority === 'low') est = 0.5;
    requiredHours += est;
  });

  // Calculate working hours
  const startParts = (settings.workingHoursStart || "09:00").split(':').map(Number);
  const endParts = (settings.workingHoursEnd || "17:00").split(':').map(Number);
  const totalWorkingHours = (endParts[0] + endParts[1]/60) - (startParts[0] + startParts[1]/60);

  // Analyze events
  let meetingTime = 0;
  let conflictCount = 0;
  const eventBlocks: {start: number, end: number, title: string}[] = [];

  calendarEvents.forEach(event => {
    if (event.start && event.end) {
      const s = new Date(event.start.dateTime || event.start.date);
      const e = new Date(event.end.dateTime || event.end.date);
      // Only consider today's events
      if (s.toISOString().split('T')[0] === todayStr || (event.start.dateTime && s.getDate() === now.getDate())) {
        const sHour = s.getHours() + s.getMinutes()/60;
        const eHour = e.getHours() + e.getMinutes()/60;
        if (sHour >= startParts[0] && eHour <= (endParts[0]+endParts[1]/60)) {
           const duration = eHour - sHour;
           meetingTime += duration;
           eventBlocks.push({ start: sHour, end: eHour, title: event.summary || 'Meeting' });
        }
      }
    }
  });

  // Detect conflicts
  eventBlocks.sort((a, b) => a.start - b.start);
  let deepWorkTime = 0;
  let lastEnd = startParts[0] + startParts[1]/60;

  for (let i = 0; i < eventBlocks.length; i++) {
    const cur = eventBlocks[i];
    if (i > 0 && cur.start < eventBlocks[i-1].end) {
      conflictCount++;
    }
    const gap = cur.start - lastEnd;
    if (gap >= 1.5) { // Deep work block is >= 1.5 hours
      deepWorkTime += gap;
    }
    lastEnd = Math.max(lastEnd, cur.end);
  }
  
  const finalGap = (endParts[0] + endParts[1]/60) - lastEnd;
  if (finalGap >= 1.5) deepWorkTime += finalGap;

  let freeHours = Math.max(0, totalWorkingHours - meetingTime);
  let idleTime = Math.max(0, freeHours - requiredHours);
  
  // Scores
  let deadlineRiskScore = Math.min(100, Math.round((requiredHours / (freeHours || 1)) * 50) + overdue * 20);
  if (deadlineRiskScore > 100) deadlineRiskScore = 100;
  
  const healthScore = Math.max(0, 100 - conflictCount * 15 - (overdue > 0 ? 20 : 0) - (requiredHours > freeHours ? 30 : 0));
  const optimizationScore = Math.min(100, 50 + deepWorkTime * 10 - conflictCount * 20);
  const productivityScore = Math.min(100, 40 + (assignments > 0 ? 20 : 0) + deepWorkTime * 15);

  // Issues
  const issues: any[] = [];
  if (conflictCount > 0) {
    issues.push({ id: 'i1', severity: 'high', title: 'Calendar Conflict', explanation: 'You have overlapping meetings today.', recommendedAction: 'Reschedule conflicting meetings.', riskScore: 80 });
  }
  if (requiredHours > freeHours) {
    issues.push({ id: 'i2', severity: 'high', title: 'Overloaded Day', explanation: `You have ${requiredHours}h of work but only ${freeHours.toFixed(1)}h free.`, recommendedAction: 'Move low-priority tasks to tomorrow.', riskScore: 90 });
  }
  if (overdue > 0) {
    issues.push({ id: 'i3', severity: 'medium', title: 'Overdue Tasks', explanation: 'You have tasks that missed their deadline.', recommendedAction: 'Complete or reschedule overdue tasks.', riskScore: 70 });
  }
  if (meetingTime > totalWorkingHours * 0.5) {
    issues.push({ id: 'i4', severity: 'medium', title: 'Meeting Heavy', explanation: 'More than half your day is spent in meetings.', recommendedAction: 'Block off deep work time.', riskScore: 60 });
  }

  // Optimized Schedule
  const optimizedSchedule: any[] = [];
  let curTime = startParts[0] + startParts[1]/60;
  
  const formatTime = (decimalHours: number) => {
    const h = Math.floor(decimalHours);
    const m = Math.round((decimalHours - h) * 60);
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
  };

  eventBlocks.forEach(eb => {
    if (eb.start > curTime) {
      optimizedSchedule.push({ timeRange: `${formatTime(curTime)}–${formatTime(eb.start)}`, activity: 'Focus / Tasks', type: 'deep_work' });
    }
    optimizedSchedule.push({ timeRange: `${formatTime(eb.start)}–${formatTime(eb.end)}`, activity: eb.title, type: 'meeting' });
    curTime = Math.max(curTime, eb.end);
  });
  
  const endTotal = endParts[0] + endParts[1]/60;
  if (curTime < endTotal) {
    optimizedSchedule.push({ timeRange: `${formatTime(curTime)}–${formatTime(endTotal)}`, activity: 'Focus / Tasks', type: 'task' });
  }

  return {
    metrics: {
      meetings: eventBlocks.length,
      assignments,
      overdue,
      freeHours: Number(freeHours.toFixed(1)),
      requiredHours: Number(requiredHours.toFixed(1)),
      meetingTime: Number(meetingTime.toFixed(1)),
      deepWorkTime: Number(deepWorkTime.toFixed(1)),
      idleTime: Number(idleTime.toFixed(1)),
      conflictCount,
      deadlineRiskScore,
      optimizationScore
    },
    healthScore,
    productivityScore,
    issues,
    optimizedSchedule
  };
}
