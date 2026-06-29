import { Task } from "../types";
import { EngineInput, TaskRisk, RiskAnalysis } from "./types";

export function calculateRisk(input: EngineInput, availableFreeHours: number): { aggregateRisk: RiskAnalysis, taskRisks: TaskRisk[] } {
  const { tasks, currentDate } = input;
  
  let totalRisk = 0;
  const taskRisks: TaskRisk[] = [];
  
  let totalWorkRemaining = 0;
  let overdueCount = 0;
  
  const pendingTasks = tasks.filter(t => !t.completed);
  
  pendingTasks.forEach(task => {
    let daysUntilDeadline = 999;
    if (task.dueDate) {
      const due = new Date(task.dueDate);
      daysUntilDeadline = (due.getTime() - currentDate.getTime()) / (1000 * 3600 * 24);
    }
    
    if (daysUntilDeadline < 0) {
      overdueCount++;
    }
    
    const duration = task.estimatedDuration || 60; // default 1 hour
    const completion = task.completionPercentage || 0;
    const workRemaining = duration * (1 - completion / 100);
    totalWorkRemaining += workRemaining;
    
    let proximityScore = 0;
    if (daysUntilDeadline < 0) proximityScore = 100;
    else if (daysUntilDeadline <= 1) proximityScore = 90;
    else if (daysUntilDeadline <= 3) proximityScore = 60;
    else if (daysUntilDeadline <= 7) proximityScore = 30;
    else proximityScore = 10;
    
    let priorityScore = 0;
    if (task.priority === "high") priorityScore = 100;
    else if (task.priority === "medium") priorityScore = 50;
    else if (task.priority === "low") priorityScore = 10;
    
    let completionScore = (100 - completion);
    
    // Quick local risk just for this task
    const taskRiskScore = Math.min(100, Math.max(0, 
      proximityScore * 0.5 + priorityScore * 0.3 + completionScore * 0.2
    ));
    
    let category: "Safe" | "Moderate" | "High" | "Critical" = "Safe";
    if (taskRiskScore > 75) category = "Critical";
    else if (taskRiskScore > 50) category = "High";
    else if (taskRiskScore > 25) category = "Moderate";
    
    taskRisks.push({
      taskId: task.id,
      score: taskRiskScore,
      category,
      reasonCodes: [],
      estimatedCompletionProbability: 100 - taskRiskScore
    });
  });
  
  const totalWorkRemainingHours = totalWorkRemaining / 60;
  
  let aggregateProximity = 0;
  if (pendingTasks.length > 0) {
     const nextDeadline = Math.min(...pendingTasks.map(t => {
       if (!t.dueDate) return 999;
       return (new Date(t.dueDate).getTime() - currentDate.getTime()) / (1000 * 3600 * 24);
     }));
     if (nextDeadline < 0) aggregateProximity = 100;
     else if (nextDeadline <= 1) aggregateProximity = 80;
     else if (nextDeadline <= 3) aggregateProximity = 50;
     else if (nextDeadline <= 7) aggregateProximity = 20;
     else aggregateProximity = 0;
  }
  
  let workRemainingScore = 0;
  if (availableFreeHours <= 0 && totalWorkRemainingHours > 0) workRemainingScore = 100;
  else if (totalWorkRemainingHours > 0) {
    workRemainingScore = Math.min(100, (totalWorkRemainingHours / availableFreeHours) * 100);
  }
  
  const calendarAvailScore = Math.min(100, Math.max(0, 100 - (availableFreeHours * 10)));
  
  const highPriorityRatio = pendingTasks.length > 0 ? pendingTasks.filter(t => t.priority === 'high').length / pendingTasks.length : 0;
  const priorityScore = highPriorityRatio * 100;
  
  const avgCompletion = pendingTasks.length > 0 ? pendingTasks.reduce((acc, t) => acc + (t.completionPercentage || 0), 0) / pendingTasks.length : 100;
  const completionScore = 100 - avgCompletion;
  
  const finalScore = Math.min(100, Math.max(0,
    aggregateProximity * 0.40 +
    workRemainingScore * 0.25 +
    calendarAvailScore * 0.20 +
    priorityScore * 0.10 +
    completionScore * 0.05
  ));
  
  let category: "Safe" | "Moderate" | "High" | "Critical" = "Safe";
  if (finalScore > 75) category = "Critical";
  else if (finalScore > 50) category = "High";
  else if (finalScore > 25) category = "Moderate";
  
  const reasonCodes = [];
  if (aggregateProximity > 80) reasonCodes.push("Imminent Deadlines");
  if (workRemainingScore > 80) reasonCodes.push("High Workload");
  if (calendarAvailScore > 80) reasonCodes.push("Low Calendar Availability");
  if (overdueCount > 0) reasonCodes.push("Overdue Tasks Existing");

  const aggregateRisk: RiskAnalysis = {
    score: Math.round(finalScore),
    category,
    reasonCodes,
    estimatedCompletionProbability: Math.round(100 - finalScore)
  };
  
  return { aggregateRisk, taskRisks };
}
