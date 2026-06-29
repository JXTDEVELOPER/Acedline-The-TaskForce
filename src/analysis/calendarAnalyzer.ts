import { EngineInput, DailyHours } from "./types";

export function analyzeCalendar(input: EngineInput): DailyHours {
  const { events, workingHours, currentDate, workingDays } = input;
  
  // Parse working hours
  const [startH, startM] = workingHours.start.split(':').map(Number);
  const [endH, endM] = workingHours.end.split(':').map(Number);
  
  const totalWorkingMinutes = (endH * 60 + endM) - (startH * 60 + startM);
  
  const today = currentDate.getDay();
  // If today is not a working day, hours might be 0, but for now we assume they can work if tasks exist. Let's strictly adhere to workingDays.
  const isWorkingDay = workingDays.includes(today);
  const baseMinutes = isWorkingDay ? Math.max(0, totalWorkingMinutes) : 0;
  
  let meetingMinutes = 0;
  let focusMinutes = 0;
  
  // Filter events for today only
  const startOfDay = new Date(currentDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(currentDate);
  endOfDay.setHours(23, 59, 59, 999);
  
  events.forEach(e => {
    if (e.endTime > startOfDay && e.startTime < endOfDay) {
      const start = Math.max(e.startTime.getTime(), startOfDay.getTime());
      const end = Math.min(e.endTime.getTime(), endOfDay.getTime());
      const durationMins = (end - start) / 60000;
      
      if (e.isFocusBlock) {
        focusMinutes += durationMins;
      } else if (e.isMeeting) {
        meetingMinutes += durationMins;
      }
    }
  });
  
  const breaksMinutes = isWorkingDay ? 60 : 0; // Assume 1 hour of breaks
  
  const availableMinutes = Math.max(0, baseMinutes - meetingMinutes - focusMinutes - breaksMinutes);
  
  const availableHours = availableMinutes / 60;
  const meetingHours = meetingMinutes / 60;
  const focusHours = focusMinutes / 60;
  
  return {
    availableHours: Number(availableHours.toFixed(1)),
    availableFocusHours: Number(availableHours.toFixed(1)), // Can be refined
    remainingProductiveTime: Number(availableHours.toFixed(1)),
    meetingHours: Number(meetingHours.toFixed(1)),
    focusHours: Number(focusHours.toFixed(1)),
    idleHours: Number(availableHours.toFixed(1))
  };
}
