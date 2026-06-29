import { EngineInput, TimeEstimation } from "./types";

export function estimateTime(input: EngineInput): TimeEstimation {
  const { tasks } = input;
  
  let remainingMins = 0;
  let totalMins = 0;
  
  tasks.forEach(task => {
    const duration = task.estimatedDuration || 60;
    const completion = task.completionPercentage || 0;
    
    totalMins += duration;
    if (!task.completed) {
      remainingMins += duration * (1 - completion / 100);
    }
  });
  
  const requiredDailyHours = remainingMins / 60; // highly naive, assuming needed today
  
  let probability = 100;
  if (remainingMins > 8 * 60) {
    probability = Math.max(0, 100 - (remainingMins - 8 * 60) / 10);
  }
  
  return {
    remainingWorkHours: Number((remainingMins / 60).toFixed(1)),
    requiredDailyHours: Number(requiredDailyHours.toFixed(1)),
    completionProbability: Math.round(probability)
  };
}
