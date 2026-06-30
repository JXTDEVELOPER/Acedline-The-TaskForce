import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Settings as SettingsIcon, Bot, FileText, Presentation, Table, FormInput, Lightbulb, GraduationCap, Mail, Bug, ChevronRight, LayoutList, ArrowUp, ArrowDown, Eye, EyeOff, CalendarCheck2, Target, CalendarDays, Columns, Wand2, Home, Save, History, X } from 'lucide-react';
import { AppSettings, useSettings, DashboardView } from '../hooks/useSettings';

interface SettingsDashboardProps {
  onOpenDebug?: () => void;
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
}

export function SettingsDashboard({ onOpenDebug, settings, updateSettings }: SettingsDashboardProps) {
  const [whatsappNumberInput, setWhatsappNumberInput] = useState(settings.whatsappNumber || '');
  const [isSaved, setIsSaved] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  const versionHistoryData = [
    {
      version: 'v1.2.0',
      date: 'June 30, 2026',
      changes: [
        'Added AI Brief generation to the Welcome Dashboard.',
        'Implemented a smart caching layer for external API calls to reduce quota usage.',
        'Added a manual "Refresh Cache" button and Last Synced timestamp in the sidebar.',
        'Added Version History panel to Developer Tools in Settings.'
      ],
      failedAttempts: [
        'Attempted direct database syncing (encountered conflicts and rolled back).',
        'Tried to implement an offline mode with local storage (failed due to data size limits).'
      ]
    },
    {
      version: 'v1.1.0',
      date: 'June 29, 2026',
      changes: [
        'Implemented Kanban Board and Google Calendar integrations.',
        'Added Google Classroom assignments syncing.',
        'Introduced AI-powered Smart Task Autofill.',
        'Added Google Workspace document generation (Docs, Sheets, Slides, Forms, Keep).',
        'Integrated WhatsApp notification webhook support.'
      ]
    },
    {
      version: 'v1.0.0',
      date: 'June 28, 2026',
      changes: [
        'Initial deployment of Taskspace platform.',
        'Firebase Google OAuth integration and user session handling.',
        'Core UI layout and sidebar navigation established.',
        'Settings Dashboard creation.'
      ]
    }
  ];

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
      case 'welcome': return { Icon: Home, label: 'Welcome Dashboard' };
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

          <section className="mt-8 pt-6 border-t border-natural-border">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4 px-1">WhatsApp Notifications</h3>
            <p className="text-sm text-neutral-500 mb-4 px-1">Configure your WhatsApp number to receive critical task alerts.</p>
            <div className="p-5 bg-white dark:bg-[#111112] border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Your WhatsApp Number</label>
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                  <input
                    type="tel"
                    placeholder="e.g. +1234567890"
                    className="w-full max-w-sm bg-natural-panel dark:bg-[#1D1B1A] border border-natural-border rounded-lg p-2 text-sm text-natural-text-dark focus:ring-2 focus:ring-indigo-500"
                    value={whatsappNumberInput}
                    onChange={(e) => {
                      setWhatsappNumberInput(e.target.value);
                      setIsSaved(false);
                    }}
                  />
                  <button
                    onClick={() => {
                      updateSettings({ whatsappNumber: whatsappNumberInput });
                      setIsSaved(true);
                      setTimeout(() => setIsSaved(false), 2000);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    {isSaved ? "Saved!" : "Save"}
                  </button>
                </div>
              </div>
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-lg text-sm text-yellow-800 dark:text-yellow-200 flex items-start gap-2">
                <Bug className="w-5 h-5 shrink-0 mt-0.5" />
                <p>
                  <strong>Warning:</strong> WhatsApp messages can only be seen from the builder's phone because it's using the Twilio Sandbox. Please send the sandbox join message from your phone first to receive alerts.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-8 pt-6 border-t border-natural-border">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4 px-1">Theme & Appearance</h3>
            <p className="text-sm text-neutral-500 mb-4 px-1">Customize the look and feel of Taskspace.</p>
            
            <div className="mb-6 grid grid-cols-1 gap-3">
              <SettingRow 
                icon={Wand2} 
                title="Login Background Shader" 
                description="Enable the WebGL aurora background animation on the login screen."
                settingKey="enableShader"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-white dark:bg-[#111112] border border-neutral-200 dark:border-neutral-800 rounded-xl">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Background Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    className="h-9 w-9 shrink-0 rounded border border-natural-border p-0.5 bg-natural-panel dark:bg-[#1D1B1A] cursor-pointer"
                    value={settings.theme?.backgroundColor || '#f4f4f5'}
                    onChange={(e) => updateSettings({ theme: { ...settings.theme, backgroundColor: e.target.value } })}
                  />
                  <input
                    type="text"
                    placeholder="e.g. #f4f4f5"
                    className="flex-1 w-full bg-natural-panel dark:bg-[#1D1B1A] border border-natural-border rounded-lg p-2 text-sm text-natural-text-dark focus:ring-2 focus:ring-indigo-500"
                    value={settings.theme?.backgroundColor || ''}
                    onChange={(e) => updateSettings({ theme: { ...settings.theme, backgroundColor: e.target.value } })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Panel/Card Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    className="h-9 w-9 shrink-0 rounded border border-natural-border p-0.5 bg-natural-panel dark:bg-[#1D1B1A] cursor-pointer"
                    value={settings.theme?.panelColor || '#ffffff'}
                    onChange={(e) => updateSettings({ theme: { ...settings.theme, panelColor: e.target.value } })}
                  />
                  <input
                    type="text"
                    placeholder="e.g. #ffffff"
                    className="flex-1 w-full bg-natural-panel dark:bg-[#1D1B1A] border border-natural-border rounded-lg p-2 text-sm text-natural-text-dark focus:ring-2 focus:ring-indigo-500"
                    value={settings.theme?.panelColor || ''}
                    onChange={(e) => updateSettings({ theme: { ...settings.theme, panelColor: e.target.value } })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Accent/Banner Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    className="h-9 w-9 shrink-0 rounded border border-natural-border p-0.5 bg-natural-panel dark:bg-[#1D1B1A] cursor-pointer"
                    value={settings.theme?.accentColor || '#7D8471'}
                    onChange={(e) => updateSettings({ theme: { ...settings.theme, accentColor: e.target.value } })}
                  />
                  <input
                    type="text"
                    placeholder="e.g. #7D8471"
                    className="flex-1 w-full bg-natural-panel dark:bg-[#1D1B1A] border border-natural-border rounded-lg p-2 text-sm text-natural-text-dark focus:ring-2 focus:ring-indigo-500"
                    value={settings.theme?.accentColor || ''}
                    onChange={(e) => updateSettings({ theme: { ...settings.theme, accentColor: e.target.value } })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Font Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    className="h-9 w-9 shrink-0 rounded border border-natural-border p-0.5 bg-natural-panel dark:bg-[#1D1B1A] cursor-pointer"
                    value={settings.theme?.fontColor || '#2C2825'}
                    onChange={(e) => updateSettings({ theme: { ...settings.theme, fontColor: e.target.value } })}
                  />
                  <input
                    type="text"
                    placeholder="e.g. #2C2825"
                    className="flex-1 w-full bg-natural-panel dark:bg-[#1D1B1A] border border-natural-border rounded-lg p-2 text-sm text-natural-text-dark focus:ring-2 focus:ring-indigo-500"
                    value={settings.theme?.fontColor || ''}
                    onChange={(e) => updateSettings({ theme: { ...settings.theme, fontColor: e.target.value } })}
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Font Style</label>
                <select
                  className="w-full bg-natural-panel dark:bg-[#1D1B1A] border border-natural-border rounded-lg p-2 text-sm text-natural-text-dark focus:ring-2 focus:ring-indigo-500"
                  value={settings.theme?.fontFamily || 'Inter'}
                  onChange={(e) => updateSettings({ theme: { ...settings.theme, fontFamily: e.target.value as any } })}
                >
                  <option value="Inter">Inter (Default)</option>
                  <option value="system-ui">System</option>
                  <option value="serif">Serif</option>
                  <option value="monospace">Monospace</option>
                </select>
              </div>
              <div className="md:col-span-2 pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => updateSettings({ theme: { backgroundColor: '', panelColor: '', accentColor: '', fontColor: '', fontFamily: 'Inter' } })}
                  className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-md"
                >
                  Reset to defaults
                </button>
              </div>
            </div>
          </section>

          {onOpenDebug && (
            <section className="mt-8 pt-6 border-t border-natural-border">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4 px-1">Developer Tools</h3>
              <div className="flex flex-col gap-3">
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
                
                <div 
                  onClick={() => {
                    console.log("Opening version history");
                    setShowVersionHistory(true);
                  }}
                  className="flex items-center justify-between p-4 bg-indigo-50/50 hover:bg-indigo-50 dark:bg-indigo-900/10 dark:hover:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/50 rounded-xl cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                      <History className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-indigo-900 dark:text-indigo-100">Version History</h4>
                      <p className="text-sm text-indigo-600/80 dark:text-indigo-400/80">View recent improvements, features, and fixes.</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-indigo-400" />
                </div>
              </div>
            </section>
          )}
        </div>
      </div>

      {showVersionHistory && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0b0b0c] border border-natural-border p-6 rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-natural-text-dark">Version History</h3>
                  <p className="text-sm text-natural-text-secondary">Release notes and improvements</p>
                </div>
              </div>
              <button 
                onClick={() => setShowVersionHistory(false)}
                className="p-2 text-natural-text-secondary hover:text-natural-text-dark hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-6">
              {versionHistoryData.map((release, index) => (
                <div key={index} className="relative pl-6 pb-2">
                  <div className="absolute left-0 top-1.5 w-2 h-2 bg-indigo-500 rounded-full"></div>
                  {index !== versionHistoryData.length - 1 && (
                    <div className="absolute left-[3px] top-3 bottom-[-1.5rem] w-px bg-natural-border"></div>
                  )}
                  <div className="flex items-baseline gap-3 mb-2">
                    <h4 className="text-lg font-bold text-natural-text-dark">{release.version}</h4>
                    <span className="text-sm font-mono text-natural-text-secondary">{release.date}</span>
                  </div>
                  <ul className="space-y-2">
                    {release.changes.map((change, i) => (
                      <li key={i} className="flex items-start gap-2 text-natural-text-primary">
                        <span className="text-indigo-500 mt-1.5">•</span>
                        <span>{change}</span>
                      </li>
                    ))}
                    {release.failedAttempts && release.failedAttempts.map((attempt, i) => (
                      <li key={`failed-${i}`} className="flex items-start gap-2 text-rose-500/80 dark:text-rose-400/80 line-through">
                        <span className="text-rose-500/50 mt-1.5">•</span>
                        <span>{attempt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-4 border-t border-natural-border">
              <button 
                onClick={() => setShowVersionHistory(false)}
                className="w-full py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-natural-text-dark font-medium rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
