import { EngineInput, Conflict } from "./types";

export function detectConflicts(input: EngineInput): Conflict[] {
  const conflicts: Conflict[] = [];
  const { events, tasks, currentDate } = input;
  
  // 1. Overlapping Events
  const sortedEvents = [...events].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  
  for (let i = 0; i < sortedEvents.length - 1; i++) {
    const current = sortedEvents[i];
    const next = sortedEvents[i + 1];
    
    if (current.endTime > next.startTime) {
      conflicts.push({
        severity: "High",
        reason: "Overlapping events",
        affectedEvents: [current.id, next.id],
        affectedTasks: [],
        suggestedFix: "Reschedule one of the overlapping events."
      });
    }
  }
  
  // 2. Task Deadline Collisions
  const pendingTasks = tasks.filter(t => !t.completed && t.dueDate);
  pendingTasks.forEach(task => {
    const due = new Date(task.dueDate!);
    if (due < currentDate) {
      conflicts.push({
        severity: "High",
        reason: "Task is overdue",
        affectedEvents: [],
        affectedTasks: [task.id],
        suggestedFix: "Complete or reschedule the task."
      });
    }
  });
  
  // 3. Back to back meetings (3 or more)
  // Simplified logic for back-to-back:
  let b2bChain = 0;
  for (let i = 0; i < sortedEvents.length - 1; i++) {
    const current = sortedEvents[i];
    const next = sortedEvents[i + 1];
    
    const gapMins = (next.startTime.getTime() - current.endTime.getTime()) / 60000;
    if (gapMins >= 0 && gapMins <= 5) {
      b2bChain++;
      if (b2bChain >= 2) { // 3 events in a row
         conflicts.push({
            severity: "Medium",
            reason: "Meeting chain (back-to-back)",
            affectedEvents: [current.id, next.id],
            affectedTasks: [],
            suggestedFix: "Schedule a 15-minute break between meetings."
         });
         b2bChain = 0; // reset
      }
    } else {
      b2bChain = 0;
    }
  }

  return conflicts;
}
