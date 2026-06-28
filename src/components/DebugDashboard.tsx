import React from "react";
import { User } from "firebase/auth";
import { Task } from "../types";
import { Bug, Terminal, Database } from "lucide-react";

interface DebugDashboardProps {
  user: User | null;
  tasks: Task[];
  token: string | null;
  calendarEvents: any[];
}

export const DebugDashboard: React.FC<DebugDashboardProps> = ({
  user,
  tasks,
  token,
  calendarEvents,
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-10 lg:p-12">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="mb-8 flex items-center justify-between pb-6 border-b border-natural-border">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-natural-text-primary flex items-center gap-3">
              <Bug className="h-6 w-6 text-rose-500" />
              System Debug
            </h1>
            <p className="mt-1 text-sm font-medium text-natural-text-secondary">
              Diagnostic information and raw state values
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-[#151515] rounded-2xl border border-natural-border p-6 shadow-xs">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Terminal className="h-5 w-5 text-indigo-500" />
              Auth State
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-natural-text-secondary uppercase tracking-wider mb-1">User</p>
                <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-3 overflow-auto max-h-40">
                  <pre className="text-xs font-mono text-natural-text-primary">
                    {user ? JSON.stringify({
                      uid: user.uid,
                      email: user.email,
                      displayName: user.displayName
                    }, null, 2) : "null"}
                  </pre>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-natural-text-secondary uppercase tracking-wider mb-1">Google OAuth Token</p>
                <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-3 overflow-auto max-h-32">
                  <pre className="text-xs font-mono text-natural-text-primary break-all">
                    {token ? `${token.substring(0, 30)}...` : "null"}
                  </pre>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#151515] rounded-2xl border border-natural-border p-6 shadow-xs">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Database className="h-5 w-5 text-emerald-500" />
              Data State
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-natural-text-secondary uppercase tracking-wider mb-1 flex justify-between">
                  <span>Tasks</span>
                  <span>{tasks.length}</span>
                </p>
                <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-3 overflow-auto max-h-40">
                  <pre className="text-xs font-mono text-natural-text-primary">
                    {JSON.stringify(tasks.slice(0, 2), null, 2)}
                    {tasks.length > 2 && "\n... (more truncated)"}
                  </pre>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-natural-text-secondary uppercase tracking-wider mb-1 flex justify-between">
                  <span>Calendar Events</span>
                  <span>{calendarEvents.length}</span>
                </p>
                <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-3 overflow-auto max-h-32">
                  <pre className="text-xs font-mono text-natural-text-primary">
                    {JSON.stringify(calendarEvents.slice(0, 2), null, 2)}
                    {calendarEvents.length > 2 && "\n... (more truncated)"}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
