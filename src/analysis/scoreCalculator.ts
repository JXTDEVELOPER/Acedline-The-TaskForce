import { EngineInput, ScoreAnalysis, CalendarHealth, DailyHours, RiskAnalysis } from "./types";

export function calculateProductivity(input: EngineInput, hours: DailyHours, risk: RiskAnalysis): ScoreAnalysis {
  const { tasks, currentDate } = input;
  
  const completedToday = tasks.filter(t => {
    if (!t.completed || !t.updatedAt) return false;
    const updated = new Date(t.updatedAt);
    return updated.toDateString() === currentDate.toDateString();
  }).length;
  
  const overdueCount = tasks.filter(t => {
    if (t.completed || !t.dueDate) return false;
    return new Date(t.dueDate) < currentDate;
  }).length;
  
  const totalTasks = tasks.length || 1; // Avoid div by 0
  const completionRatio = Math.min(100, (completedToday / (completedToday + tasks.filter(t => !t.completed).length || 1)) * 100);
  
  const totalActiveHours = hours.focusHours + hours.meetingHours + hours.availableHours || 1;
  const focusRatio = Math.min(100, (hours.focusHours / totalActiveHours) * 100);
  const meetingRatio = Math.min(100, (hours.meetingHours / totalActiveHours) * 100);
  
  // Meeting ratio penalty: optimal is around 10-30%, higher is worse
  const meetingScore = Math.max(0, 100 - (meetingRatio > 30 ? (meetingRatio - 30) * 2 : 0));
  
  const deadlineHealth = 100 - risk.score;
  const calendarBalance = 100; // Will be derived from calendar health
  
  const score = Math.min(100, Math.max(0, 
    completionRatio * 0.40 +
    focusRatio * 0.20 +
    meetingScore * 0.15 +
    deadlineHealth * 0.15 +
    calendarBalance * 0.10
  ));
  
  let grade: ScoreAnalysis["grade"] = "Average";
  if (score > 80) grade = "Excellent";
  else if (score > 60) grade = "Good";
  else if (score > 40) grade = "Average";
  else if (score > 20) grade = "Poor";
  else grade = "Critical";
  
  return { score: Math.round(score), grade };
}

export function calculateCalendarHealth(input: EngineInput, hours: DailyHours): CalendarHealth {
  let score = 100;
  const suggestions: string[] = [];
  
  if (hours.meetingHours > 6) {
    score -= 30;
    suggestions.push("Too many meetings. Consider declining non-essential ones.");
  } else if (hours.meetingHours > 4) {
    score -= 15;
    suggestions.push("High meeting load.");
  }
  
  if (hours.availableHours < 2) {
    score -= 20;
    suggestions.push("Insufficient time for independent work.");
  }
  
  if (hours.focusHours < 1 && hours.availableHours > 2) {
    score -= 10;
    suggestions.push("Consider scheduling a dedicated focus block.");
  }
  
  // Reward
  if (hours.focusHours >= 2 && hours.meetingHours <= 4) {
    score += 10;
    suggestions.push("Good balance of deep work and collaboration today.");
  }
  
  score = Math.min(100, Math.max(0, score));
  
  let status: CalendarHealth["status"] = "Average";
  if (score > 80) status = "Excellent";
  else if (score > 60) status = "Good";
  else if (score > 40) status = "Average";
  else if (score > 20) status = "Poor";
  else status = "Critical";
  
  return {
    score: Math.round(score),
    status,
    suggestions
  };
}
