import { EngineInput, OptimizedSchedule, ScheduleBlock } from "./types";

export function optimizeSchedule(input: EngineInput): OptimizedSchedule {
  const { tasks, events, workingHours, currentDate } = input;
  const timeline: ScheduleBlock[] = [];
  
  // Parse hours
  const [startH, startM] = workingHours.start.split(':').map(Number);
  const [endH, endM] = workingHours.end.split(':').map(Number);
  
  const dayStart = new Date(currentDate);
  dayStart.setHours(startH, startM, 0, 0);
  
  const dayEnd = new Date(currentDate);
  dayEnd.setHours(endH, endM, 0, 0);
  
  let currentTime = new Date(currentDate);
  if (currentTime < dayStart) {
    currentTime = new Date(dayStart);
  }
  
  // Add fixed events
  events.forEach(e => {
    if (e.endTime > currentTime && e.startTime < dayEnd) {
      timeline.push({
        type: e.isMeeting ? "Meeting" : (e.isFocusBlock ? "Focus" : "Task"),
        title: e.title,
        startTime: new Date(Math.max(e.startTime.getTime(), currentTime.getTime())),
        endTime: new Date(Math.min(e.endTime.getTime(), dayEnd.getTime())),
        eventId: e.id
      });
    }
  });
  
  // Sort tasks by priority and deadline
  const pendingTasks = tasks.filter(t => !t.completed).sort((a, b) => {
    // 1. High priority first
    const pMap: Record<string, number> = { "high": 3, "medium": 2, "low": 1 };
    const pA = pMap[a.priority || "medium"];
    const pB = pMap[b.priority || "medium"];
    if (pA !== pB) return pB - pA;
    
    // 2. Deadline
    if (a.dueDate && b.dueDate) {
       return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    
    return 0;
  });
  
  // Simple scheduling into free blocks
  // Find free blocks between events
  timeline.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  
  const newTimeline: ScheduleBlock[] = [...timeline];
  
  let currentScanTime = new Date(currentTime);
  
  pendingTasks.forEach(task => {
    let durationRemaining = (task.estimatedDuration || 60) * (1 - (task.completionPercentage || 0) / 100);
    
    if (durationRemaining <= 0) return;
    
    // Simplistic block allocation (very naive for demonstration)
    // Find gaps between events
    for (let i = 0; i <= timeline.length; i++) {
       const blockStart = i === 0 ? currentScanTime : timeline[i-1].endTime;
       const blockEnd = i === timeline.length ? dayEnd : timeline[i].startTime;
       
       if (blockStart < blockEnd) {
          const gapMins = (blockEnd.getTime() - blockStart.getTime()) / 60000;
          if (gapMins >= 15) {
             const allocMins = Math.min(gapMins, durationRemaining);
             const allocEnd = new Date(blockStart.getTime() + allocMins * 60000);
             
             newTimeline.push({
                type: "Task",
                title: task.title,
                startTime: new Date(blockStart),
                endTime: new Date(allocEnd),
                taskId: task.id
             });
             
             durationRemaining -= allocMins;
             if (durationRemaining <= 0) break;
          }
       }
    }
  });
  
  newTimeline.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  
  return {
    timeline: newTimeline,
    estimatedFinishTime: newTimeline.length > 0 ? newTimeline[newTimeline.length - 1].endTime : currentTime
  };
}
