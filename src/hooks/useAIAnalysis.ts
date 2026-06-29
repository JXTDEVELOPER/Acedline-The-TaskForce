import { useState, useEffect, useCallback } from 'react';
import { aiAnalysisService, CombinedAnalysis } from '../lib/aiAnalysisService';
import { Task } from '../types';
import { AppSettings } from './useSettings';

export function useAIAnalysis(user: any, tasks: Task[], calendarEvents: any[], settings: AppSettings) {
  const [data, setData] = useState<CombinedAnalysis | null>(aiAnalysisService.getCurrentData());
  const [loading, setLoading] = useState(!aiAnalysisService.getCurrentData());
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = useCallback(async (forceRefresh = false) => {
    if (!user) return;
    try {
      setLoading(true);
      const result = await aiAnalysisService.getAnalysis(tasks, calendarEvents, settings, user, forceRefresh);
      setData(result);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load analysis');
    } finally {
      setLoading(false);
    }
  }, [user, tasks, calendarEvents, settings]);

  useEffect(() => {
    fetchAnalysis(false);
    
    const unsubscribe = aiAnalysisService.subscribe(() => {
      setData(aiAnalysisService.getCurrentData());
    });
    return unsubscribe;
  }, [fetchAnalysis]);

  return { data, loading, error, refresh: () => fetchAnalysis(true) };
}
