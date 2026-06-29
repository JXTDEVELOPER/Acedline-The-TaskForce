import { useState, useEffect, useMemo, useCallback } from "react";
import { Task } from "../types";
import { EngineInput, EngineOutput, CalendarEvent } from "./types";
import { analyze } from "./analysisEngine";
import { useSettings } from "../hooks/useSettings";

export function useAnalysisEngine(tasks: Task[], events: CalendarEvent[], currentDate: Date) {
  const { settings } = useSettings();
  
  const [output, setOutput] = useState<EngineOutput | null>(null);
  const [loading, setLoading] = useState(true);
  
  const engineInput = useMemo<EngineInput>(() => {
    return {
      tasks,
      events,
      workingHours: {
        start: settings.scheduling?.workStartTime || "09:00",
        end: settings.scheduling?.workEndTime || "17:00"
      },
      focusDuration: settings.scheduling?.focusDuration || 90,
      breakDuration: settings.scheduling?.breakDuration || 15,
      workingDays: settings.scheduling?.workingDays || [1, 2, 3, 4, 5],
      currentDate
    };
  }, [tasks, events, settings.scheduling, currentDate]);
  
  const refresh = useCallback(() => {
    setLoading(true);
    // Use setTimeout to allow UI to render loading state if needed, but since it's sync and fast:
    try {
      const result = analyze(engineInput);
      setOutput(result);
    } catch (e) {
      console.error("Analysis Engine Error:", e);
    } finally {
      setLoading(false);
    }
  }, [engineInput]);
  
  useEffect(() => {
    refresh();
  }, [refresh]);
  
  return {
    analysis: output,
    risk: output?.risk,
    calendarHealth: output?.calendarHealth,
    productivity: output?.productivity,
    recommendations: output?.recommendations || [],
    optimizedSchedule: output?.schedule,
    conflicts: output?.conflicts || [],
    issues: output?.issues || [],
    dashboardMetrics: output?.metrics,
    loading,
    refresh
  };
}
