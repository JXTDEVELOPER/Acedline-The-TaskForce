import React from 'react';
import { Settings as SettingsIcon, Bot, FileText, Presentation, Table, FormInput, Lightbulb, GraduationCap, Mail, Bug, ChevronRight, LayoutList, ArrowUp, ArrowDown, Eye, EyeOff, CalendarCheck2, Target, CalendarDays, Columns } from 'lucide-react';
import { AppSettings, useSettings, DashboardView } from '../hooks/useSettings';

interface SettingsDashboardProps {
  onOpenDebug?: () => void;
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
}

export function SettingsDashboard({ onOpenDebug, settings, updateSettings }: SettingsDashboardProps) {

  const handleToggle = (key: keyof AppSettings) => {
    // Check if it's a regular boolean setting
    if (typeof settings[key] === 'boolean') {
      updateSettings({ [key]: !settings[key] });
    }
  };

  const handleSidebarVisibilityToggle = (view: DashboardView) => {
    updateSettings({
      sidebarVisibility: {
        ...settings.sidebarVisibility,
        [view]: !settings.sidebarVisibility[view]
      }
    });
  };

  const handleMoveSidebarItem = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === settings.sidebarOrder.length - 1)
    ) return;

    const newOrder = [...settings.sidebarOrder];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    
    [newOrder[index], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[index]];
    
    updateSettings({ sidebarOrder: newOrder });
  };

  const SettingRow = ({ icon: Icon, title, description, settingKey }: { icon: any, title: string, description: string, settingKey: keyof AppSettings }) => (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-[#111112] border border-neutral-200 dark:border-neutral-800 rounded-xl">
      <div className="flex items-center gap-4">
        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">{title}</h4>
          <p className="text-sm text-neutral-500">{description}</p>
        </div>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input 
          type="checkbox" 
          className="sr-only peer" 
          checked={settings[settingKey] as boolean} 
          onChange={() => handleToggle(settingKey)}
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
      </label>
    </div>
  );

  const getDashboardIconAndLabel = (view: DashboardView) => {
    switch (view) {
      case 'event-management': return { Icon: CalendarCheck2, label: 'Event Management' };
      case 'self-directed': return { Icon: Target, label: 'Self-Directed Activity' };
      case 'classroom': return { Icon: GraduationCap, label: 'Classroom' };
      case 'calendar': return { Icon: CalendarDays, label: 'Calendar' };
      case 'boards': return { Icon: Columns, label: 'Boards' };
      default: return { Icon: LayoutList, label: view };
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-natural-bg/50 dark:bg-[#151515] p-6 pb-24 rounded-tl-3xl border-t border-l border-natural-border flex flex-col">
      <div className="max-w-4xl mx-auto w-full flex flex-col gap-6 flex-1">
        <header className="flex items-center gap-2 mb-2">
          <SettingsIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-2xl font-bold text-natural-text-dark">Settings</h2>
        </header>

        <div className="space-y-6">
          <section>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4 px-1">Sidebar Navigation</h3>
            <p className="text-sm text-neutral-500 mb-4 px-1">Toggle visibility and reorder your sidebar navigation items.</p>
            <div className="flex flex-col gap-2">
              {settings.sidebarOrder.map((view, index) => {
                const { Icon, label } = getDashboardIconAndLabel(view);
                const isVisible = settings.sidebarVisibility[view];
                
                return (
                  <div key={view} className="flex items-center justify-between p-3 bg-white dark:bg-[#111112] border border-neutral-200 dark:border-neutral-800 rounded-xl">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleSidebarVisibilityToggle(view)}
                        className={`p-2 rounded-lg transition-colors ${isVisible ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:text-indigo-400' : 'text-neutral-400 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700'}`}
                        title={isVisible ? "Hide in sidebar" : "Show in sidebar"}
                      >
                        {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <div className={`flex items-center gap-2 ${isVisible ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-400 dark:text-neutral-500'}`}>
                        <Icon className="w-4 h-4" />
                        <span className="font-medium text-sm">{label}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveSidebarItem(index, 'up')}
                        disabled={index === 0}
                        className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveSidebarItem(index, 'down')}
                        disabled={index === settings.sidebarOrder.length - 1}
                        className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="mt-8 pt-6 border-t border-natural-border">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4 px-1">AI Features & Integrations</h3>
            <div className="grid grid-cols-1 gap-3">
              <SettingRow 
                icon={Bot} 
                title="AI Productivity Coach" 
                description="Enable the AI coach for step-by-step task planning."
                settingKey="enableAiCoach"
              />
              <SettingRow 
                icon={Mail} 
                title="AI Email Drafter" 
                description="Enable drafting emails directly to Gmail."
                settingKey="enableAiEmailDrafter"
              />
              <SettingRow 
                icon={FileText} 
                title="AI Google Docs" 
                description="Allow AI to generate action plans in Google Docs."
                settingKey="enableAiDocs"
              />
              <SettingRow 
                icon={Presentation} 
                title="AI Google Slides" 
                description="Allow AI to generate presentations in Google Slides."
                settingKey="enableAiSlides"
              />
              <SettingRow 
                icon={Table} 
                title="AI Google Sheets" 
                description="Allow AI to generate trackers in Google Sheets."
                settingKey="enableAiSheets"
              />
              <SettingRow 
                icon={FormInput} 
                title="AI Google Forms" 
                description="Allow AI to generate questionnaires in Google Forms."
                settingKey="enableAiForms"
              />
              <SettingRow 
                icon={Lightbulb} 
                title="AI Google Keep" 
                description="Allow AI to generate notes in Google Keep."
                settingKey="enableAiKeep"
              />
              <SettingRow 
                icon={GraduationCap} 
                title="AI Google Classroom" 
                description="Allow AI to generate courses in Google Classroom."
                settingKey="enableAiClassroom"
              />
            </div>
          </section>

          {onOpenDebug && (
            <section className="mt-8 pt-6 border-t border-natural-border">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4 px-1">Developer Tools</h3>
              <div 
                onClick={onOpenDebug}
                className="flex items-center justify-between p-4 bg-rose-50/50 hover:bg-rose-50 dark:bg-rose-900/10 dark:hover:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 rounded-xl cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg">
                    <Bug className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-rose-900 dark:text-rose-100">Debug Dashboard</h4>
                    <p className="text-sm text-rose-600/80 dark:text-rose-400/80">View raw states, token info, and force synchronizations.</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-rose-400" />
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
