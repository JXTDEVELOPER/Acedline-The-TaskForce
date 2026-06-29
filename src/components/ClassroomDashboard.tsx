import React, { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { GraduationCap, Loader2, RefreshCcw, ExternalLink } from "lucide-react";
import { listGoogleClassrooms, listClassroomCourseWork } from "../lib/workspace";

interface ClassroomDashboardProps {
  user: User;
  token: string | null;
  onSyncClassroomTasks: () => Promise<void>;
}

export function ClassroomDashboard({ user, token, onSyncClassroomTasks }: ClassroomDashboardProps) {
  const [courses, setCourses] = useState<any[]>([]);
  const [courseWork, setCourseWork] = useState<Record<string, any[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchClassroomData = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const fetchedCourses = await listGoogleClassrooms(token);
      setCourses(fetchedCourses);

      const workRecord: Record<string, any[]> = {};
      await Promise.all(
        fetchedCourses.map(async (course) => {
          const work = await listClassroomCourseWork(course.id, token);
          workRecord[course.id] = work;
        })
      );
      setCourseWork(workRecord);
    } catch (error) {
      console.error("Error fetching classroom data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClassroomData();
  }, [token]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await onSyncClassroomTasks();
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-natural-bg/50 dark:bg-[#151515] p-6 pb-24 rounded-tl-3xl border-t border-l border-natural-border">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
              <GraduationCap className="h-5 w-5" />
              <h2 className="text-xl font-bold text-natural-text-dark">Google Classroom</h2>
            </div>
            <p className="text-sm text-natural-text-secondary">
              View your courses and assignments. Sync them to your tasks.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 transition-colors disabled:opacity-50"
            >
              {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Sync Assignments to Tasks
            </button>
          </div>
        </header>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-natural-text-secondary">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mb-4" />
            <p>Loading your courses...</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-white/50 dark:bg-[#0b0b0c]/50 backdrop-blur-xl border border-natural-border rounded-2xl p-8 text-center">
            <GraduationCap className="h-12 w-12 text-natural-text-secondary mx-auto mb-4" />
            <h3 className="text-lg font-medium text-natural-text-dark">No Active Courses</h3>
            <p className="text-sm text-natural-text-secondary mt-1">You are not enrolled in any active Google Classroom courses.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div key={course.id} className="bg-white/50 dark:bg-[#0b0b0c]/50 backdrop-blur-xl border border-natural-border rounded-2xl overflow-hidden shadow-sm flex flex-col">
                <div className="p-4 bg-emerald-50/50 dark:bg-emerald-900/10 border-b border-natural-border">
                  <h3 className="font-semibold text-natural-text-dark line-clamp-1">{course.name}</h3>
                  {course.section && <p className="text-xs text-natural-text-secondary mt-0.5">{course.section}</p>}
                  <a 
                    href={course.alternateLink} 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 mt-2 font-medium"
                  >
                    Open in Classroom <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="p-4 flex-1 flex flex-col gap-3">
                  <h4 className="text-xs font-semibold text-natural-text-secondary uppercase tracking-wider">Assignments</h4>
                  {courseWork[course.id]?.length > 0 ? (
                    <ul className="space-y-3">
                      {courseWork[course.id].map((work: any) => (
                        <li key={work.id} className="flex flex-col gap-1">
                          <div className="flex items-start justify-between">
                            <span className="text-sm font-medium text-natural-text-dark">{work.title}</span>
                          </div>
                          {work.dueDate && (
                            <span className="text-[10px] text-natural-text-secondary">
                              Due: {work.dueDate.year}-{String(work.dueDate.month).padStart(2, '0')}-{String(work.dueDate.day).padStart(2, '0')}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-natural-text-secondary italic">No assignments found.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
