import { Task } from '../types';
import { AppSettings } from '../hooks/useSettings';
import { computeLocalAnalysis, LocalAnalysis } from './localAnalyzer';

export interface AIInsights {
  greeting: string;
  proactiveWarning?: string;
  insights: string[];
  recommendations: any[];
  coachMessage?: string;
}

export interface CombinedAnalysis extends LocalAnalysis {
  aiData: AIInsights;
  lastUpdated: number;
}

function getTimeOfDayGreeting(name: string): string {
  const hr = new Date().getHours();
  let greet = 'Hello';
  if (hr < 12) {
    greet = 'Good morning';
  } else if (hr < 17) {
    greet = 'Good afternoon';
  } else {
    greet = 'Good evening';
  }
  return `${greet}, ${name}.`;
}

class AIAnalysisService {
  private cache: Map<string, CombinedAnalysis> = new Map();
  private pendingRequest: Promise<CombinedAnalysis> | null = null;
  private currentKey: string = '';
  private currentData: CombinedAnalysis | null = null;
  private listeners: Set<() => void> = new Set();
  
  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  private notify() {
    this.listeners.forEach(l => l());
  }

  private generateKey(tasks: Task[], events: any[], settings: AppSettings) {
    const taskStr = tasks.filter(t => !t.completed).map(t => `${t.id}|${t.dueDate}|${t.priority}`).join(',');
    const eventStr = events.map(e => `${e.id}|${e.start?.dateTime || e.start?.date}|${e.end?.dateTime || e.end?.date}`).join(',');
    return `${taskStr}##${eventStr}##${settings.workingHoursStart}-${settings.workingHoursEnd}`;
  }

  public async getAnalysis(tasks: Task[], calendarEvents: any[], settings: AppSettings, user: any, forceRefresh = false): Promise<CombinedAnalysis> {
    const key = this.generateKey(tasks, calendarEvents, settings);
    
    // Check cache
    if (this.currentData && this.currentKey === key && !forceRefresh) {
      const isExpired = Date.now() - this.currentData.lastUpdated > 15 * 60 * 1000;
      if (!isExpired) {
        return this.currentData;
      }
    }

    if (this.pendingRequest) {
      return this.pendingRequest;
    }

    const localData = computeLocalAnalysis(tasks, calendarEvents, settings);

    this.pendingRequest = fetch('/api/ai-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userName: user?.displayName || 'User',
        currentTime: new Date().toISOString(),
        localTime: new Date().toLocaleTimeString(),
        localData
      })
    })
    .then(res => {
      if (!res.ok) throw new Error('Failed to fetch AI insights');
      return res.json();
    })
    .then((aiData: AIInsights) => {
      const combined: CombinedAnalysis = {
        ...localData,
        aiData,
        lastUpdated: Date.now()
      };
      this.currentData = combined;
      this.currentKey = key;
      this.pendingRequest = null;
      this.notify();
      return combined;
    })
    .catch(err => {
      console.warn('AI Analysis failed, falling back to local only:', err);
      // Fallback
      const fallbackCombined: CombinedAnalysis = {
        ...localData,
        aiData: {
          greeting: getTimeOfDayGreeting(user?.displayName?.split(' ')[0] || 'User'),
          proactiveWarning: localData.issues.length > 0 ? localData.issues[0].title : undefined,
          insights: ['AI insights temporarily unavailable.'],
          recommendations: localData.issues.map(i => ({ title: i.title, description: i.explanation, action: i.recommendedAction })),
          coachMessage: 'Keep up the good work! AI analysis is offline.'
        },
        lastUpdated: Date.now()
      };
      this.currentData = fallbackCombined;
      this.currentKey = key;
      this.pendingRequest = null;
      this.notify();
      return fallbackCombined;
    });

    return this.pendingRequest;
  }

  public getCurrentData() {
    return this.currentData;
  }
}

export const aiAnalysisService = new AIAnalysisService();
