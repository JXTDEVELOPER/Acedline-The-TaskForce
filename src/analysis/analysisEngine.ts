import { EngineInput, EngineOutput, Recommendation, DetectedIssue, DashboardMetrics } from "./types";
import { calculateRisk } from "./riskCalculator";
import { analyzeCalendar } from "./calendarAnalyzer";
import { calculateProductivity, calculateCalendarHealth } from "./scoreCalculator";
import { detectConflicts } from "./conflictDetector";
import { optimizeSchedule } from "./scheduleOptimizer";
import { estimateTime } from "./timeEstimator";

export function analyze(input: EngineInput): EngineOutput {
  const hours = analyzeCalendar(input);
  const { aggregateRisk, taskRisks } = calculateRisk(input, hours.availableHours);
  const productivity = calculateProductivity(input, hours, aggregateRisk);
  const calendarHealth = calculateCalendarHealth(input, hours);
  const conflicts = detectConflicts(input);
  const schedule = optimizeSchedule(input);
  const timeEstimation = estimateTime(input);
  
  const recommendations: Recommendation[] = [];
  const issues: DetectedIssue[] = [];
  
  // Issue Detection
  const { tasks, currentDate } = input;
  let due24h = 0;
  let due48h = 0;
  
  tasks.filter(t => !t.completed).forEach(task => {
    if (task.dueDate) {
      const days = (new Date(task.dueDate).getTime() - currentDate.getTime()) / 86400000;
      if (days > 0 && days <= 1) due24h++;
      if (days > 1 && days <= 2) due48h++;
    }
  });
  
  if (due24h > 0) {
     issues.push({ type: "Deadline", severity: "High", description: `${due24h} tasks due within 24 hours.` });
  }
  if (hours.meetingHours > 6) {
     issues.push({ type: "Overload", severity: "High", description: `More than 6 meeting hours today.` });
  }
  if (hours.availableHours < 2 && timeEstimation.remainingWorkHours > 4) {
     issues.push({ type: "Capacity", severity: "High", description: `Critical workload: insufficient time to complete pending work.` });
  }
  
  // Smart Recommendations
  const highRiskTasks = taskRisks.filter(tr => tr.score > 75);
  if (highRiskTasks.length > 0) {
     const t = tasks.find(x => x.id === highRiskTasks[0].taskId);
     if (t) {
       recommendations.push({
         priority: "High",
         reason: "Task is at critical risk of missing deadline.",
         estimatedBenefit: "Reduces deadline risk by 30%",
         estimatedTimeSaved: 0
       });
     }
  }
  
  if (hours.focusHours < 1) {
     recommendations.push({
       priority: "Medium",
       reason: "Low focus time today.",
       estimatedBenefit: "Improves productivity score by 15%",
       estimatedTimeSaved: 0
     });
  }

  if (conflicts.length > 0) {
     recommendations.push({
       priority: "High",
       reason: "Calendar conflicts detected.",
       estimatedBenefit: "Prevents double-booking",
       estimatedTimeSaved: 15
     });
  }
  
  const overdueCount = tasks.filter(t => {
     if (t.completed || !t.dueDate) return false;
     return new Date(t.dueDate) < currentDate;
  }).length;
  
  let workloadLevel: DashboardMetrics["workloadLevel"] = "Balanced";
  if (timeEstimation.remainingWorkHours > 8) workloadLevel = "Heavy";
  if (timeEstimation.remainingWorkHours > 12) workloadLevel = "Overloaded";
  if (timeEstimation.remainingWorkHours < 3) workloadLevel = "Light";

  const metrics: DashboardMetrics = {
    calendarHealth: calendarHealth.score,
    deadlineRisk: aggregateRisk.score,
    productivityScore: productivity.score,
    freeHours: hours.availableHours,
    requiredHours: timeEstimation.requiredDailyHours,
    meetingHours: hours.meetingHours,
    focusHours: hours.focusHours,
    deepWorkHours: hours.focusHours, // simplistic
    idleHours: hours.idleHours,
    conflictCount: conflicts.length,
    overdueCount,
    completionRate: tasks.length > 0 ? (tasks.filter(t => t.completed).length / tasks.length) * 100 : 100,
    workloadLevel
  };

  return {
    risk: aggregateRisk,
    taskRisks,
    hours,
    productivity,
    calendarHealth,
    conflicts,
    schedule,
    timeEstimation,
    recommendations,
    issues,
    metrics
  };
}
