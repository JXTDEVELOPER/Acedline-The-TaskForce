import { useState, useEffect } from 'react';

export type DashboardView = "event-management" | "self-directed" | "classroom" | "calendar" | "boards";

export interface AppSettings {
  enableAiCoach: boolean;
  enableAiEmailDrafter: boolean;
  enableAiDocs: boolean;
  enableAiSlides: boolean;
  enableAiSheets: boolean;
  enableAiForms: boolean;
  enableAiKeep: boolean;
  enableAiClassroom: boolean;
  sidebarOrder: DashboardView[];
  sidebarVisibility: Record<DashboardView, boolean>;
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
  sidebarOrder: ["event-management", "self-directed", "classroom", "calendar", "boards"],
  sidebarVisibility: {
    "event-management": true,
    "self-directed": true,
    "classroom": true,
    "calendar": true,
    "boards": true,
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
