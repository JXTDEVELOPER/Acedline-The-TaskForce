import { Task } from "../types";

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  isFocusBlock?: boolean;
  isMeeting?: boolean;
}

export interface WorkingHours {
  start: string; // "HH:mm"
  end: string;   // "HH:mm"
}

export interface EngineInput {
  tasks: Task[];
  events: CalendarEvent[];
  workingHours: WorkingHours;
  focusDuration: number;
  breakDuration: number;
  workingDays: number[];
  currentDate: Date;
}

export interface RiskAnalysis {
  score: number;
  category: "Safe" | "Moderate" | "High" | "Critical";
  reasonCodes: string[];
  estimatedCompletionProbability: number;
}

export interface TaskRisk extends RiskAnalysis {
  taskId: string;
}

export interface DailyHours {
  availableHours: number;
  availableFocusHours: number;
  remainingProductiveTime: number;
  meetingHours: number;
  focusHours: number;
  idleHours: number;
}

export interface ScoreAnalysis {
  score: number;
  grade: "Excellent" | "Good" | "Average" | "Poor" | "Critical";
}

export interface CalendarHealth {
  score: number;
  status: "Excellent" | "Good" | "Average" | "Poor" | "Critical";
  suggestions: string[];
}

export interface Conflict {
  severity: "High" | "Medium" | "Low";
  reason: string;
  affectedTasks: string[];
  affectedEvents: string[];
  suggestedFix: string;
}

export interface ScheduleBlock {
  type: "Task" | "Focus" | "Break" | "Meeting";
  title: string;
  startTime: Date;
  endTime: Date;
  taskId?: string;
  eventId?: string;
}

export interface OptimizedSchedule {
  timeline: ScheduleBlock[];
  estimatedFinishTime?: Date;
}

export interface TimeEstimation {
  remainingWorkHours: number;
  estimatedFinishDate?: Date;
  requiredDailyHours: number;
  completionProbability: number;
}

export interface Recommendation {
  priority: "High" | "Medium" | "Low";
  reason: string;
  estimatedBenefit: string;
  estimatedTimeSaved: number; // in minutes
}

export interface DetectedIssue {
  type: string;
  severity: "High" | "Medium" | "Low";
  description: string;
}

export interface DashboardMetrics {
  calendarHealth: number;
  deadlineRisk: number;
  productivityScore: number;
  freeHours: number;
  requiredHours: number;
  meetingHours: number;
  focusHours: number;
  deepWorkHours: number;
  idleHours: number;
  conflictCount: number;
  overdueCount: number;
  completionRate: number;
  workloadLevel: "Light" | "Balanced" | "Heavy" | "Overloaded";
}

export interface EngineOutput {
  risk: RiskAnalysis;
  taskRisks: TaskRisk[];
  hours: DailyHours;
  productivity: ScoreAnalysis;
  calendarHealth: CalendarHealth;
  conflicts: Conflict[];
  schedule: OptimizedSchedule;
  timeEstimation: TimeEstimation;
  recommendations: Recommendation[];
  issues: DetectedIssue[];
  metrics: DashboardMetrics;
}
