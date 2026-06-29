import { useState, useCallback, useMemo, useEffect } from 'react';
import { Task } from '../types';
import { AppSettings } from './useSettings';
import { useAIAnalysis } from './useAIAnalysis';

export interface Issue {
  id: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  explanation: string;
  recommendedAction: string;
  riskScore: number;
}

export interface Recommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  type: string;
  description: string;
  benefit: string;
}

export interface OptimizedActivity {
  timeRange: string;
  activity: string;
  type: 'deep_work' | 'meeting' | 'task' | 'break' | 'idle';
}

export interface AnalysisData {
  healthScore: number;
  productivityScore: number;
  metrics: {
    freeHours: number;
    requiredHours: number;
    meetingTime: number;
    deepWorkTime: number;
    idleTime: number;
    conflictCount: number;
    deadlineRiskScore: number;
    optimizationScore: number;
  };
  insights: string[];
  issues: Issue[];
  recommendations: Recommendation[];
  optimizedSchedule: OptimizedActivity[];
  lastUpdated?: number;
}

export function useCalendarAnalyzer(user: any, tasks: Task[], calendarEvents: any[], settings: AppSettings) {
  const { data: combinedData, loading, error, refresh } = useAIAnalysis(user, tasks, calendarEvents, settings);
  
  const analyze = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) refresh();
  }, [refresh]);

  const [adaptedData, setAdaptedData] = useState<AnalysisData | null>(null);

  useEffect(() => {
    if (combinedData) {
      setAdaptedData({
        healthScore: combinedData.healthScore,
        productivityScore: combinedData.productivityScore,
        metrics: combinedData.metrics,
        insights: combinedData.aiData.insights || [],
        issues: combinedData.issues,
        recommendations: combinedData.aiData.recommendations || [],
        optimizedSchedule: combinedData.optimizedSchedule,
        lastUpdated: combinedData.lastUpdated
      });
    } else {
      setAdaptedData(null);
    }
  }, [combinedData]);

  return {
    data: adaptedData,
    loading,
    error,
    analyze
  };
}
