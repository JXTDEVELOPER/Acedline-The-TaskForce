import { useState, useEffect } from 'react';

export type DashboardView = "daily-brief" | "calendar-analyzer" | "event-management" | "self-directed" | "classroom" | "calendar" | "boards";

export type FontStyle = 'Inter' | 'system-ui' | 'serif' | 'monospace';

export interface ThemeSettings {
  backgroundColor?: string;
  panelColor?: string;
  accentColor?: string;
  fontColor?: string;
  fontFamily?: FontStyle;
}

export interface AppSettings {
  enableAiCoach: boolean;
  enableProactiveAi: boolean;
  hasPromptedProactiveAi: boolean;
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
  workingHoursStart: string;
  workingHoursEnd: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  enableAiCoach: true,
  enableProactiveAi: false,
  hasPromptedProactiveAi: false,
  enableAiEmailDrafter: true,
  enableAiDocs: true,
  enableAiSlides: true,
  enableAiSheets: true,
  enableAiForms: true,
  enableAiKeep: true,
  enableAiClassroom: true,
  enableShader: true,
  workingHoursStart: "09:00",
  workingHoursEnd: "17:00",
  sidebarOrder: ["daily-brief", "calendar-analyzer", "event-management", "self-directed", "classroom", "calendar", "boards"],
  sidebarVisibility: {
    "daily-brief": true,
    "calendar-analyzer": true,
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
  }
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('app_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure new views are in sidebarOrder if missing
        if (parsed.sidebarOrder && !parsed.sidebarOrder.includes("daily-brief")) {
          parsed.sidebarOrder = ["daily-brief", ...parsed.sidebarOrder];
        }
        if (parsed.sidebarVisibility && parsed.sidebarVisibility["daily-brief"] === undefined) {
          parsed.sidebarVisibility["daily-brief"] = true;
        }
        if (parsed.sidebarOrder && !parsed.sidebarOrder.includes("calendar-analyzer")) {
          parsed.sidebarOrder = ["calendar-analyzer", ...parsed.sidebarOrder];
        }
        if (parsed.sidebarVisibility && parsed.sidebarVisibility["calendar-analyzer"] === undefined) {
          parsed.sidebarVisibility["calendar-analyzer"] = true;
        }
        return { ...DEFAULT_SETTINGS, ...parsed };
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
