import { useState, useEffect } from 'react';

export type DashboardView = "daily-brief" | "event-management" | "self-directed" | "classroom" | "calendar" | "boards";

export type FontStyle = 'Inter' | 'system-ui' | 'serif' | 'monospace';

export interface ThemeSettings {
  backgroundColor?: string;
  panelColor?: string;
  accentColor?: string;
  fontColor?: string;
  fontFamily?: FontStyle;
}

export interface SchedulingSettings {
  workStartTime: string; // "09:00"
  workEndTime: string; // "17:00"
  workingDays: number[]; // 0 for Sunday, 1 for Monday, etc. Default [1,2,3,4,5]
  focusDuration: number; // in minutes
  breakDuration: number; // in minutes
}

export interface AppSettings {
  enableAiCoach: boolean;
  enableAiEmailDrafter: boolean;
  enableAiDocs: boolean;
  enableAiSlides: boolean;
  enableAiSheets: boolean;
  enableAiForms: boolean;
  enableAiKeep: boolean;
  enableAiClassroom: boolean;
  enableShader: boolean;
  sidebarOrder: DashboardView[];
  sidebarVisibility: Record<DashboardView, boolean>;
  theme?: ThemeSettings;
  scheduling?: SchedulingSettings;
}

const DEFAULT_SETTINGS: AppSettings = {
  enableAiCoach: true,
  enableAiEmailDrafter: true,
  enableAiDocs: true,
  enableAiSlides: true,
  enableAiSheets: true,
  enableAiForms: true,
  enableAiKeep: true,
  enableAiClassroom: true,
  enableShader: true,
  sidebarOrder: ["daily-brief", "event-management", "self-directed", "classroom", "calendar", "boards"],
  sidebarVisibility: {
    "daily-brief": true,
    "event-management": true,
    "self-directed": true,
    "classroom": true,
    "calendar": true,
    "boards": true,
  },
  theme: {
    backgroundColor: '',
    panelColor: '',
    accentColor: '',
    fontColor: '',
    fontFamily: 'Inter',
  },
  scheduling: {
    workStartTime: "09:00",
    workEndTime: "17:00",
    workingDays: [1, 2, 3, 4, 5],
    focusDuration: 90,
    breakDuration: 15,
  }
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('app_settings');
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch (e) {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('app_settings', JSON.stringify(updated));
      return updated;
    });
  };

  return { settings, updateSettings };
}
