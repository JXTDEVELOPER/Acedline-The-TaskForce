import { useEffect, useState } from "react";
import { User } from "firebase/auth";
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  or
} from "firebase/firestore";
import {
  db,
  initAuth,
  googleSignIn,
  logout,
  OperationType,
  handleFirestoreError,
} from "./lib/firebase";
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  listCalendarEvents,
} from "./lib/calendar";
import { createMeetSpace } from "./lib/meet";
import { createGoogleTask, updateGoogleTask, deleteGoogleTask, listGoogleTasks } from "./lib/tasks";
import { Task } from "./types";
import { GsiButton } from "./components/GsiButton";
import { TaskForm } from "./components/TaskForm";
import { TaskItem } from "./components/TaskItem";
import { RegistrationPage } from "./components/RegistrationPage";
import { RegistrationFormBuilder } from "./components/RegistrationFormBuilder";
import { SelfDirectedActivityDashboard } from "./components/SelfDirectedActivityDashboard";
import { ClassroomDashboard } from "./components/ClassroomDashboard";
import { CalendarDashboard } from "./components/CalendarDashboard";
import { KanbanBoard } from "./components/KanbanBoard";
import { DebugDashboard } from "./components/DebugDashboard";
import { SettingsDashboard } from "./components/SettingsDashboard";
import { DailyBriefDashboard } from "./components/DailyBriefDashboard";
import { OverdueTasksBanner } from "./components/OverdueTasksBanner";
import { ThemeInjector } from "./components/ThemeInjector";
import { LoginBackground } from "./components/LoginBackground";
import { useSettings } from "./hooks/useSettings";
import { LogOut, CalendarCheck2, LayoutList, RefreshCcw, AlertTriangle, Calendar, Sun, Moon, Menu, X, ChevronLeft, ChevronRight, Target, Columns, GraduationCap, CalendarDays, Plus, Bug, Settings as SettingsIcon, LayoutDashboard } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

export default function App() {
  const { settings, updateSettings } = useSettings();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [registerTaskId, setRegisterTaskId] = useState<string | null>(null);
  const [taskToManageRegistration, setTaskToManageRegistration] = useState<Task | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState<"daily-brief" | "event-management" | "self-directed" | "classroom" | "calendar" | "boards" | "debug" | "settings">("daily-brief");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");

  // Theme support
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  // Calendar Event Import State variables
  const [showImportModal, setShowImportModal] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [importingEventIds, setImportingEventIds] = useState<string[]>([]);
  const [isAddingEvent, setIsAddingEvent] = useState(false);

  // Load Registration route parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const registerId = params.get("register");
    if (registerId) {
      setRegisterTaskId(registerId);
    }
  }, []);

  // Load Auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setAuthChecking(false);
      },
      () => {
        // Logged out or needs popup authorization
        setUser(null);
        setToken(null);
        setAuthChecking(false);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (token) {
      listCalendarEvents(token)
        .then((gEvents) => setCalendarEvents(gEvents))
        .catch((err) => console.error("Silently failed to fetch calendar events:", err));
    }
  }, [token]);

  // Listen to Firestore tasks (Client-side sorted to avoid composite index requirements)
  useEffect(() => {
    if (!user) {
      setTasks([]);
      return;
    }

    setLoading(true);
    
    let unsubscribeOwned: () => void;
    let unsubscribeShared: (() => void) | undefined;

    const handleSnapshot = (ownedSnapshot?: any, sharedSnapshot?: any) => {
      const list: Task[] = [];
      const seen = new Set<string>();

      const processDoc = (docSnap: any) => {
        if (!seen.has(docSnap.id)) {
          seen.add(docSnap.id);
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            userId: data.userId,
            title: data.title,
            description: data.description || "",
            dueDate: data.dueDate || undefined,
            completed: !!data.completed,
            priority: data.priority,
            stage: data.stage,
            workspaceType: data.workspaceType,
            assigneeEmail: data.assigneeEmail,
            sharedWith: data.sharedWith || [],
            googleEventId: data.googleEventId || null,
            meetLink: data.meetLink || null,
            googleTaskId: data.googleTaskId || null,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          });
        }
      };

      if (ownedSnapshot) {
        ownedSnapshot.forEach(processDoc);
      }
      if (sharedSnapshot) {
        sharedSnapshot.forEach(processDoc);
      }

      setTasks(list);
      setLoading(false);
    };

    let latestOwnedSnapshot: any = null;
    let latestSharedSnapshot: any = null;

    const qOwned = query(collection(db, "tasks"), where("userId", "==", user.uid));
    unsubscribeOwned = onSnapshot(
      qOwned,
      (snapshot) => {
        latestOwnedSnapshot = snapshot;
        handleSnapshot(latestOwnedSnapshot, latestSharedSnapshot);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "tasks");
        setLoading(false);
      }
    );

    if (user.email) {
      const qShared = query(collection(db, "tasks"), where("sharedWith", "array-contains", user.email));
      unsubscribeShared = onSnapshot(
        qShared,
        (snapshot) => {
          latestSharedSnapshot = snapshot;
          handleSnapshot(latestOwnedSnapshot, latestSharedSnapshot);
        },
        (error) => {
          console.error("Error fetching shared tasks:", error);
        }
      );
    }

    return () => {
      unsubscribeOwned();
      if (unsubscribeShared) {
        unsubscribeShared();
      }
    };
  }, [user]);

  // Handle Google OAuth Sign-in & Refresh Token
  const handleSignIn = async () => {
    setAuthChecking(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
      }
    } catch (err) {
      console.error("Sign in failed:", err);
    } finally {
      setAuthChecking(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      setUser(null);
      setToken(null);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Action: Add Task
  const handleAddTask = async (
    title: string,
    description: string,
    dueDate?: string,
    addMeet?: boolean,
    addGoogleTask?: boolean,
    registrationFields?: any[],
    priority?: "high" | "medium" | "low",
    assigneeEmail?: string,
    workspaceTypeOverride?: "personal" | "team"
  ) => {
    if (!user) return;
    setIsSyncing(true);
    setSyncErrorMessage(null);

    if (!priority) {
      try {
        const aiRes = await fetch("/api/smart-task-autofill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, dueDate }),
        });
        if (aiRes.ok) {
          const aiData = await aiRes.json();
          if (aiData.priority) {
            priority = aiData.priority;
          }
        }
      } catch (e) {
        console.error("AI priority evaluation failed:", e);
      }
    }

    let googleEventId: string | null = null;
    let meetLink: string | null = null;
    let googleTaskId: string | null = null;
    const tempTaskId = `task-${Date.now()}`;
    const workspaceType = activeView === 'event-management' ? 'team' : 'personal';
    const sharedWith = assigneeEmail ? [assigneeEmail] : [];

    // 1. Generate Google Meet Link if selected
    if (addMeet && token) {
      try {
        meetLink = await createMeetSpace(token);
      } catch (e: any) {
        console.error("Google Meet creation failed:", e);
        setSyncErrorMessage("Failed to generate Google Meet link. Storing task without meeting.");
      }
    }

    // 2. Sync to Google Tasks if selected and token exists
    if (addGoogleTask && token) {
      try {
        const dummyTaskForTasks: Task = {
          id: tempTaskId,
          userId: user.uid,
          title,
          description,
          dueDate,
          completed: false,
          priority,
          workspaceType,
          assigneeEmail,
          sharedWith,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        googleTaskId = await createGoogleTask(dummyTaskForTasks, token);
      } catch (e: any) {
        console.error("Google Tasks Sync failed during creation:", e);
        setSyncErrorMessage("Google Tasks creation failed, task stored locally.");
      }
    }

    try {
      // 3. Sync immediately to Google Calendar if deadline matches and token exists
      if (dueDate && token) {
        const dummyTaskForCalendar: Task = {
          id: tempTaskId,
          userId: user.uid,
          title,
          description,
          dueDate,
          completed: false,
          priority,
          meetLink,
          googleTaskId,
          workspaceType,
          assigneeEmail,
          sharedWith,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        googleEventId = await createCalendarEvent(dummyTaskForCalendar, token);
      }
    } catch (e: any) {
      console.error("Google Calendar Sync failed during creation:", e);
      setSyncErrorMessage("Initial calendar placement failed, task stored locally or in Tasks.");
    }

    try {
      // 4. Commit model to Firestore
      const taskDocRef = doc(db, "tasks", tempTaskId);
      await setDoc(taskDocRef, {
        id: tempTaskId,
        userId: user.uid,
        title,
        description: description || null,
        dueDate: dueDate || null,
        completed: false,
        priority: priority || null,
        workspaceType,
        assigneeEmail: assigneeEmail || null,
        sharedWith,
        googleEventId: googleEventId || null,
        meetLink: meetLink || null,
        googleTaskId: googleTaskId || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // If AI generated any registration form fields, create form schema in Firestore immediately
      if (registrationFields && registrationFields.length > 0) {
        const formDocRef = doc(db, "registration_forms", tempTaskId);
        await setDoc(formDocRef, {
          taskId: tempTaskId,
          userId: user.uid,
          title,
          description: description || "Register for this event.",
          fields: registrationFields,
          googleFormId: null,
          googleFormUrl: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // Open registration suite overlay task modal
        const newTaskRecord: Task = {
          id: tempTaskId,
          userId: user.uid,
          title,
          description: description || null,
          dueDate: dueDate || null,
          completed: false,
          priority: priority,
          googleEventId: googleEventId || null,
          meetLink: meetLink || null,
          googleTaskId: googleTaskId || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setTaskToManageRegistration(newTaskRecord);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `tasks/${tempTaskId}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Action: Generate Google Meet space for a task
  const handleCreateMeetSpace = async (task: Task) => {
    if (!user || !token) return;
    setIsSyncing(true);
    setSyncErrorMessage(null);

    try {
      const meetLink = await createMeetSpace(token);
      
      // Update Google Calendar event if synchronized
      if (task.googleEventId) {
        try {
          const updatedTaskPayload = {
            ...task,
            meetLink,
          };
          await updateCalendarEvent(updatedTaskPayload, token);
        } catch (calError) {
          console.error("Failed to update Google Calendar event with Meet link:", calError);
        }
      }

      // Update Firestore model
      const taskDocRef = doc(db, "tasks", task.id);
      await updateDoc(taskDocRef, {
        meetLink: meetLink,
        updatedAt: serverTimestamp(),
      });
    } catch (e: any) {
      console.error("Google Meet creation failed:", e);
      setSyncErrorMessage("Failed to create Google Meet space. Please check permissions.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Action: Synchronize an existing task with Google Tasks
  const handleCreateGoogleTask = async (task: Task) => {
    if (!user || !token) return;
    setIsSyncing(true);
    setSyncErrorMessage(null);

    try {
      const googleTaskId = await createGoogleTask(task, token);

      const taskDocRef = doc(db, "tasks", task.id);
      await updateDoc(taskDocRef, {
        googleTaskId: googleTaskId,
        updatedAt: serverTimestamp(),
      });
    } catch (e: any) {
      console.error("Google Tasks sync failed:", e);
      setSyncErrorMessage("Failed to sync to Google Tasks. Please check permissions.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Action: Toggle completion status
  const handleToggleComplete = async (task: Task) => {
    if (!user) return;
    setIsSyncing(true);
    setSyncErrorMessage(null);

    const updatedCompletedState = !task.completed;

    // Optional Google Calendar Update
    try {
      if (task.googleEventId && token) {
        const updatedTaskPayload = {
          ...task,
          completed: updatedCompletedState,
        };
        await updateCalendarEvent(updatedTaskPayload, token);
      }
    } catch (e) {
      console.error("Google Calendar Update failed:", e);
      setSyncErrorMessage("Failed to update status on Google Calendar, synced state cached.");
    }

    // Optional Google Tasks Update
    try {
      if (task.googleTaskId && token) {
        const updatedTaskPayload = {
          ...task,
          completed: updatedCompletedState,
        };
        await updateGoogleTask(updatedTaskPayload, token);
      }
    } catch (e) {
      console.error("Google Tasks Update failed:", e);
      setSyncErrorMessage("Failed to update status on Google Tasks, synced state cached.");
    }

    try {
      const taskDocRef = doc(db, "tasks", task.id);
      await updateDoc(taskDocRef, {
        completed: updatedCompletedState,
        stage: updatedCompletedState ? "done" : (task.stage === "done" ? "todo" : task.stage || "todo"),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${task.id}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Action: Update Task Stage (Kanban)
  const handleUpdateStage = async (taskId: string, stage: string) => {
    if (!user) return;
    setIsSyncing(true);
    setSyncErrorMessage(null);

    try {
      const taskDocRef = doc(db, "tasks", taskId);
      await updateDoc(taskDocRef, {
        stage,
        completed: stage === "done",
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${taskId}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Action: Trigger Deletion with a Custom Overlay confirmation dialog
  const handleDeleteTask = async (task: Task) => {
    setTaskToDelete(task);
  };

  // Action: Perform actual delete operation after user confirms in the custom dialog
  const performDeleteTask = async (task: Task) => {
    if (!user) return;
    setIsSyncing(true);
    setSyncErrorMessage(null);

    // 1. Delete on Google Calendar first
    if (task.googleEventId && token) {
      try {
        await deleteCalendarEvent(task.googleEventId, token);
      } catch (e) {
        console.error("Google Calendar Event Delete failed:", e);
        setSyncErrorMessage("Failed to remove from Google Calendar. Task removed locally.");
      }
    }

    // 2. Delete on Google Tasks
    if (task.googleTaskId && token) {
      try {
        await deleteGoogleTask(task.googleTaskId, token);
      } catch (e) {
        console.error("Google Tasks Delete failed:", e);
        setSyncErrorMessage("Failed to remove from Google Tasks. Task removed locally.");
      }
    }

    // 3. Delete on Firestore
    try {
      const taskDocRef = doc(db, "tasks", task.id);
      await deleteDoc(taskDocRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tasks/${task.id}`);
    } finally {
      setIsSyncing(false);
      setTaskToDelete(null);
    }
  };

  // Action: Clear all done tasks
  const handleClearDoneTasks = async () => {
    if (!user) return;
    setIsSyncing(true);
    setSyncErrorMessage(null);

    const doneTasks = tasks.filter((t) => {
      const effectiveStage = t.completed ? "done" : (t.stage === "done" && !t.completed ? "todo" : (t.stage || "todo"));
      return effectiveStage === "done";
    });
    
    let hasError = false;
    try {
      for (const task of doneTasks) {
        if (task.googleEventId && token) {
          try {
            await deleteCalendarEvent(task.googleEventId, token);
          } catch (e) {
            console.error("Google Calendar Event Delete failed:", e);
            hasError = true;
          }
        }
        if (task.googleTaskId && token) {
          try {
            await deleteGoogleTask(task.googleTaskId, token);
          } catch (e) {
            console.error("Google Tasks Delete failed:", e);
            hasError = true;
          }
        }
        const taskDocRef = doc(db, "tasks", task.id);
        await deleteDoc(taskDocRef);
      }
      if (hasError) {
        setSyncErrorMessage("Some external Google records could not be removed, but local records were cleared.");
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tasks (batch clear)`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Action: Fetch events from Google Calendar to show in import modal
  const handleFetchCalendarEvents = async () => {
    if (!token) return;
    setLoadingCalendar(true);
    setCalendarError(null);
    try {
      const gEvents = await listCalendarEvents(token);
      setCalendarEvents(gEvents);
      setShowImportModal(true);
    } catch (err: any) {
      console.error("Failed to list calendar events:", err);
      setCalendarError("Failed to fetch Google Calendar events. Please check your credentials or network and try again.");
      setShowImportModal(true);
    } finally {
      setLoadingCalendar(false);
    }
  };

  // Action: Import a single event from Google Calendar into local Tasks list
  const handleImportEvent = async (event: any) => {
    if (!user) return;
    setImportingEventIds((prev) => [...prev, event.id]);
    try {
      const docId = `task-cal-${event.id}`;
      const title = event.summary || "Untitled Event";
      const description = event.description || "";
      
      let dueDate: string | undefined = undefined;
      if (event.start) {
        dueDate = event.start.dateTime || event.start.date || undefined;
      }

      const meetLink = event.hangoutLink || null;

      const taskDocRef = doc(db, "tasks", docId);
      await setDoc(taskDocRef, {
        id: docId,
        userId: user.uid,
        title,
        description: description || null,
        dueDate: dueDate || null,
        completed: false,
        googleEventId: event.id,
        meetLink: meetLink || null,
        googleTaskId: null,
        workspaceType: activeView === 'event-management' ? 'team' : 'personal',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err: any) {
      console.error("Failed to import calendar event:", err);
      alert("Failed to import calendar event. Please try again.");
    } finally {
      setImportingEventIds((prev) => prev.filter((id) => id !== event.id));
    }
  };

  // Action: Sync Tasks from Google Tasks
  const handleSyncGoogleTasks = async () => {
    if (!user || !token) return;
    setIsSyncing(true);
    setSyncErrorMessage(null);
    try {
      const gTasks = await listGoogleTasks(token);
      for (const gt of gTasks) {
        // Find if this task already exists
        const existing = tasks.find(t => t.googleTaskId === gt.id || t.title === gt.title);
        if (existing) continue;

        const docId = `task-gt-${gt.id}`;
        let dueDate: string | undefined = undefined;
        if (gt.due) {
          dueDate = gt.due;
        }

        const taskDocRef = doc(db, "tasks", docId);
        await setDoc(taskDocRef, {
          id: docId,
          userId: user.uid,
          title: gt.title || "Untitled Task",
          description: gt.notes || null,
          dueDate: dueDate || null,
          completed: gt.status === "completed",
          workspaceType: "personal",
          googleTaskId: gt.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err: any) {
      console.error("Failed to sync Google Tasks:", err);
      setSyncErrorMessage("Failed to sync Google Tasks. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncClassroomTasks = async () => {
    if (!user || !token) return;
    setIsSyncing(true);
    setSyncErrorMessage(null);
    try {
      const { listGoogleClassrooms, listClassroomCourseWork } = await import("./lib/workspace");
      const fetchedCourses = await listGoogleClassrooms(token);
      for (const course of fetchedCourses) {
        const workItems = await listClassroomCourseWork(course.id, token);
        for (const work of workItems) {
          const docId = `task-cw-${work.id}`;
          const existing = tasks.find(t => t.id === docId);
          if (existing) continue;

          let dueDate: string | undefined = undefined;
          if (work.dueDate) {
            dueDate = `${work.dueDate.year}-${String(work.dueDate.month).padStart(2, '0')}-${String(work.dueDate.day).padStart(2, '0')}`;
          }
          if (work.dueTime && dueDate) {
            const time = `${String(work.dueTime.hours || 0).padStart(2, '0')}:${String(work.dueTime.minutes || 0).padStart(2, '0')}:00`;
            dueDate = `${dueDate}T${time}Z`; // roughly
          }

          const taskDocRef = doc(db, "tasks", docId);
          await setDoc(taskDocRef, {
            id: docId,
            userId: user.uid,
            title: `[${course.name}] ${work.title}`,
            description: work.description || null,
            dueDate: dueDate || null,
            completed: false,
            workspaceType: "personal",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }
    } catch (err: any) {
      console.error("Failed to sync Classroom tasks:", err);
      setSyncErrorMessage("Failed to sync Google Classroom. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Filter tasks based on activeView

  const filteredTasks = tasks.filter(task => {
    if (activeView === 'event-management') {
      return task.workspaceType === 'team' || (task.sharedWith && task.sharedWith.length > 0);
    } else {
      return task.workspaceType === 'personal' || !task.workspaceType;
    }
  });

  // Local Sort Policy: Non-completed tasks with earlier due dates on top, then unscheduled tasks, completed tasks at the bottom.
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;

    // Fallback to local time (approximate client id parsing)
    return b.id.localeCompare(a.id);
  });

  const activeCount = filteredTasks.filter((t) => !t.completed).length;

  // Render Registration page for public guests if requested via query parameter
  if (registerTaskId) {
    return (
      <RegistrationPage
        taskId={registerTaskId}
        onBackToDashboard={() => {
          // Clear query param and reset state to load standard dashboard
          const url = new URL(window.location.href);
          url.searchParams.delete("register");
          window.history.replaceState({}, document.title, url.toString());
          setRegisterTaskId(null);
        }}
        theme={theme}
        toggleTheme={toggleTheme}
      />
    );
  }

  // Render Login state
  if (!user) {
    return (
      <div className="flex min-h-screen flex-col justify-center bg-natural-bg dark:bg-[#02050f] px-6 py-12 antialiased relative overflow-hidden">
        <LoginBackground />
        
        <div className="absolute top-4 right-4 animate-fade-in z-10">
          <button
            onClick={toggleTheme}
            title={theme === "light" ? "Switch to Night Mode" : "Switch to Light Mode"}
            className="rounded-full border border-natural-border dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-md p-2.5 text-natural-text-secondary dark:text-white/70 shadow-sm dark:shadow-[0_4_15px_rgba(0,0,0,0.1)] hover:bg-neutral-100 dark:hover:bg-white/10 hover:text-natural-text-primary dark:hover:text-white transition-all active:scale-95 cursor-pointer"
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
        </div>
        
        <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
          {/* Minimalist Logo Icon */}
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#b400ff] text-white shadow-[0_0_30px_rgba(180,0,255,0.4)]">
            <LayoutList className="h-7 w-7" />
          </div>
          <h2 className="mt-8 text-center text-4xl font-bold tracking-tight text-white font-sans drop-shadow-md">
            Taskspace
          </h2>
          <p className="mt-3 text-center text-sm text-[#e6b3ff] font-sans font-medium max-w-[280px] mx-auto leading-relaxed">
            Declutter your schedule. Automatically sync your tasks and deadlines
            straight to Google Calendar.
          </p>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md z-10">
          <div className="flex flex-col items-center justify-center rounded-3xl bg-white/5 backdrop-blur-2xl px-8 py-12 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.2)] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
            {authChecking ? (
              <div className="flex flex-col items-center gap-3">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#b400ff]/20 border-t-[#b400ff] shadow-[0_0_15px_rgba(180,0,255,0.3)]" />
                <span className="text-xs text-[#d373ff] font-mono tracking-widest uppercase">Authenticating</span>
              </div>
            ) : (
              <button
                onClick={handleSignIn}
                className="group relative flex items-center justify-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(0,0,0,0.1)] transition-all duration-300 hover:border-[#b400ff]/50 hover:bg-white/20 hover:shadow-[0_0_30px_rgba(180,0,255,0.3)] hover:-translate-y-0.5 focus:outline-hidden focus:ring-2 focus:ring-[#b400ff]/50 active:scale-95 cursor-pointer w-full max-w-[280px]"
              >
                <div className="h-5 w-5 flex-shrink-0">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="block h-full w-full drop-shadow-sm">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                </div>
                <span>Continue with Google</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Formatting Today's date nicely in jetbrains mono
  const todayFormatted = new Date()
    .toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    })
    .toUpperCase();

  return (
    <div className="min-h-screen bg-natural-bg dark:bg-[#02050f] text-natural-text-primary dark:text-white antialiased font-sans flex flex-col md:flex-row relative overflow-hidden">
      <ThemeInjector theme={settings.theme} />
      <LoginBackground enableShader={settings.enableShader} />
      {/* Sidebar */}
      <aside className={`transition-all duration-300 ease-in-out border-natural-border dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-2xl flex flex-col shrink-0 z-10 ${isSidebarOpen ? "w-full md:w-64 p-6 md:border-r border-b md:border-b-0" : "w-0 md:w-20 p-0 md:p-4 md:border-r overflow-hidden"} md:h-screen md:sticky md:top-0 relative shadow-[4px_0_24px_rgba(0,0,0,0.05)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.5)]`}>
        <div 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`flex items-center gap-2 mb-8 cursor-pointer hover:opacity-80 transition-opacity ${!isSidebarOpen && "justify-center mb-6"}`}
          title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#b400ff] text-white shadow-[0_0_15px_rgba(180,0,255,0.4)]">
            <LayoutList className="h-4 w-4" />
          </div>
          {isSidebarOpen && (
            <span className="text-xl font-semibold tracking-tight text-natural-text-primary dark:text-white whitespace-nowrap drop-shadow-md">
              Taskspace
            </span>
          )}
        </div>

        <nav className="flex-1 space-y-2">
          {settings.sidebarOrder.map((view) => {
            if (settings.sidebarVisibility[view] === false) return null;
            
            let Icon, label;
            switch(view) {
              case "daily-brief": Icon = LayoutDashboard; label = "Daily Brief"; break;
              case "event-management": Icon = CalendarCheck2; label = "Event Management"; break;
              case "self-directed": Icon = Target; label = "Self-Directed Activity"; break;
              case "classroom": Icon = GraduationCap; label = "Classroom"; break;
              case "calendar": Icon = CalendarDays; label = "Calendar"; break;
              case "boards": Icon = Columns; label = "Boards"; break;
              default: return null;
            }

            return (
              <a
                key={view}
                href="#"
                onClick={(e) => { e.preventDefault(); setActiveView(view); }}
                className={`flex items-center rounded-xl font-medium transition-all duration-300 ${activeView === view ? "bg-natural-accent/10 dark:bg-white/10 text-natural-accent dark:text-[#b400ff] shadow-sm dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] border border-natural-border dark:border-white/5" : "text-natural-text-secondary dark:text-white/60 hover:bg-neutral-100 dark:hover:bg-white/5 hover:text-natural-text-primary dark:hover:text-white border border-transparent"} ${isSidebarOpen ? "gap-3 px-3 py-2 text-sm" : "justify-center p-2"}`}
                title={!isSidebarOpen ? label : undefined}
              >
                <Icon className={`h-5 w-5 shrink-0 ${activeView === view ? "drop-shadow-[0_0_8px_rgba(0,255,255,0.5)]" : ""}`} />
                {isSidebarOpen && <span className="whitespace-nowrap">{label}</span>}
              </a>
            );
          })}
          
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); setActiveView("settings"); }}
            className={`flex items-center rounded-xl font-medium transition-all duration-300 ${activeView === "settings" ? "bg-natural-accent/10 dark:bg-white/10 text-natural-accent dark:text-[#b400ff] shadow-sm dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] border border-natural-border dark:border-white/5" : "text-natural-text-secondary dark:text-white/60 hover:bg-neutral-100 dark:hover:bg-white/5 hover:text-natural-text-primary dark:hover:text-white border border-transparent"} ${isSidebarOpen ? "gap-3 px-3 py-2 text-sm" : "justify-center p-2"}`}
            title={!isSidebarOpen ? "Settings" : undefined}
          >
            <SettingsIcon className={`h-5 w-5 shrink-0 ${activeView === "settings" ? "drop-shadow-[0_0_8px_rgba(0,255,255,0.5)]" : ""}`} />
            {isSidebarOpen && <span className="whitespace-nowrap">Settings</span>}
          </a>
        </nav>

        <div className={`mt-auto pt-6 border-t border-white/10 flex flex-col gap-4 ${!isSidebarOpen && "items-center"}`}>

          <div className={`flex items-center gap-3 ${!isSidebarOpen && "justify-center"}`}>
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || "Avatar"}
                referrerPolicy="no-referrer"
                className="h-9 w-9 shrink-0 rounded-full border border-white/20 shadow-md"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#b400ff] text-xs font-semibold text-white uppercase shadow-[0_0_10px_rgba(180,0,255,0.4)]">
                {user.displayName?.charAt(0) || "U"}
              </div>
            )}
            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-natural-text-primary dark:text-white truncate drop-shadow-sm">
                  {user.displayName || "User"}
                </p>
                <p className="text-xs text-natural-text-secondary dark:text-white/60 truncate font-mono">
                  {user.email}
                </p>
              </div>
            )}
          </div>
          <div className={`flex justify-between gap-2 ${isSidebarOpen ? "items-center flex-row" : "flex-col items-center"}`}>
            <button
              id="theme-toggle"
              onClick={toggleTheme}
              title={theme === "light" ? "Switch to Night Mode" : "Switch to Light Mode"}
              className={`flex items-center justify-center gap-2 rounded-xl border border-natural-border dark:border-white/10 bg-white/50 dark:bg-white/5 p-2 text-xs font-medium text-natural-text-secondary dark:text-white/70 transition-all hover:bg-neutral-100 dark:hover:bg-white/10 hover:text-natural-text-primary dark:hover:text-white cursor-pointer ${isSidebarOpen ? "flex-1" : "w-10 h-10"}`}
            >
              {theme === "light" ? (
                <>
                  <Moon className="h-4 w-4 shrink-0" />
                  {isSidebarOpen && "Dark Mode"}
                </>
              ) : (
                <>
                  <Sun className="h-4 w-4 shrink-0" />
                  {isSidebarOpen && "Light Mode"}
                </>
              )}
            </button>
            <button
              id="logout-button"
              onClick={handleSignOut}
              title="Sign out"
              className={`flex items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 p-2 text-red-400 transition-all hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/50 cursor-pointer ${!isSidebarOpen && "w-10 h-10"}`}
            >
              <LogOut className="h-4 w-4 shrink-0" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden z-10 relative">
        {activeView === "daily-brief" ? (
          <div className="flex-1 overflow-y-auto">
            <DailyBriefDashboard user={user} tasks={tasks} calendarEvents={calendarEvents} />
          </div>
        ) : activeView === "event-management" ? (
          <div className="flex-1 overflow-y-auto p-4 md:p-10 lg:p-12">
            <div className="mx-auto max-w-2xl">
              {/* Header Section */}
              <header className="mb-8 flex items-center justify-between pb-6 border-b border-natural-border">
              <div>
                <div className="font-mono text-[10px] tracking-widest text-[#A09489] font-bold">
                  {todayFormatted}
                </div>
                <h1 className="mt-1 text-2xl font-light tracking-tight text-natural-text-dark">
                  Event Management
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingEvent(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-natural-accent text-white border border-transparent px-3 py-1.5 text-xs font-bold hover:bg-natural-accent-hover transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  Create Task
                </button>
                <button
                  type="button"
                  onClick={handleFetchCalendarEvents}
                  disabled={loadingCalendar}
                  className="inline-flex items-center gap-1.5 rounded-full bg-natural-accent-light/60 border border-natural-border px-3 py-1.5 text-xs font-bold text-natural-accent hover:bg-natural-accent-light hover:text-natural-accent-hover transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loadingCalendar ? (
                    <RefreshCcw className="h-3 w-3 animate-spin text-natural-accent" />
                  ) : (
                    <RefreshCcw className="h-3 w-3 text-natural-accent" />
                  )}
                  Import Events
                </button>
              </div>
            </header>

            {/* Sync Reconnect Notification */}
            {!token ? (
              <div
                id="sync-paused-banner"
                className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-natural-gold bg-[#F7F5F2] p-4"
              >
                <div>
                  <p className="text-xs font-semibold text-natural-text-dark">
                    Google Calendar sync is paused.
                  </p>
                  <p className="mt-0.5 text-[11px] text-natural-text-secondary">
                    Log in again to grant permission for calendar auto-updates.
                  </p>
                </div>
                <button
                  id="sync-reconnect-btn"
                  onClick={handleSignIn}
                  className="flex items-center gap-1.5 rounded-lg bg-natural-accent px-3 py-1.5 text-[11px] font-semibold text-white transition-all hover:bg-natural-accent-hover"
                >
                  <LayoutList className="h-3 w-3" />
                  Reconnect Calendar
                </button>
              </div>
            ) : (
              <div className="mb-4 flex items-center justify-between gap-2 text-natural-text-secondary">
                <div className="flex items-center gap-1.5">
                  <CalendarCheck2 className="h-3.5 w-3.5 text-natural-accent" />
                  <span className="font-mono text-[10px] text-natural-text-primary bg-natural-accent-light/55 px-3 py-1 rounded-full uppercase font-semibold tracking-wide">
                    Calendar sync active
                  </span>
                </div>
                <div className="font-mono text-[10px] font-semibold tracking-wider">
                  {activeCount} PENDING {activeCount === 1 ? "EVENT" : "EVENTS"}
                </div>
              </div>
            )}

            {/* Sync error notes */}
            {syncErrorMessage && (
              <div className="mb-4 rounded-lg bg-red-50 p-2.5 text-xs text-red-600">
                {syncErrorMessage}
              </div>
            )}

            {/* Overdue Tasks Banner */}
            <OverdueTasksBanner tasks={tasks} isSyncing={isSyncing} />

            {/* Insert task Form */}
            {isAddingEvent && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                <div className="bg-white dark:bg-[#0b0b0c] border border-natural-border rounded-2xl shadow-xl w-full max-w-3xl relative flex flex-col max-h-[90vh]">
                  <div className="p-4 border-b border-natural-border flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-natural-text-dark">Create a New Event Task</h3>
                    <button 
                      onClick={() => setIsAddingEvent(false)}
                      className="text-xs font-medium text-natural-text-secondary hover:text-natural-text-primary p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                    >
                      Close
                    </button>
                  </div>
                  <div className="p-4 overflow-y-auto">
                    <TaskForm 
                      onAddTask={async (...args) => {
                        await handleAddTask(...args);
                        setIsAddingEvent(false);
                      }} 
                      isSyncing={isSyncing} 
                      workspaceType={activeView === "event-management" ? "team" : "personal"} 
                    />
                  </div>
                </div>
              </div>
            )}



            {/* Tasks Container */}
            <div id="tasks-container" className="rounded-2xl p-0 mt-2">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-natural-text-secondary bg-white dark:bg-[#0b0b0c] border border-natural-border shadow-xs rounded-2xl">
                  <span className="h-5 w-5 animate-spin rounded-full border border-neutral-200 border-t-natural-accent" />
                  <span className="font-mono text-[10px] tracking-wide">Retrieving events...</span>
                </div>
              ) : sortedTasks.length === 0 ? (
                <div className="py-12 text-center text-natural-text-secondary bg-white dark:bg-[#0b0b0c] border border-natural-border shadow-xs rounded-2xl">
                  <p className="text-sm font-medium text-natural-text-dark">Nothing scheduled yet.</p>
                  <p className="mt-1 text-xs text-natural-text-secondary font-sans">
                    Sit back, or type a deadline above to sync it.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl bg-white dark:bg-[#0b0b0c] p-3 border border-natural-border shadow-xs">
                  {sortedTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onToggleComplete={handleToggleComplete}
                      onDelete={handleDeleteTask}
                      onCreateMeet={handleCreateMeetSpace}
                      onCreateGoogleTask={handleCreateGoogleTask}
                      onManageRegistration={setTaskToManageRegistration}
                      isSyncing={isSyncing}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        ) : activeView === "boards" ? (
          <div className="flex-1 overflow-y-auto p-4 md:p-10 lg:p-12">
            <div className="mx-auto max-w-full">
              <header className="mb-8 flex items-center justify-between pb-6 border-b border-natural-border">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-natural-text-primary">
                    Project Board
                  </h1>
                  <p className="mt-1 text-sm font-medium text-natural-text-secondary">
                    Manage task stages visually
                  </p>
                </div>
              </header>
              <OverdueTasksBanner tasks={tasks} isSyncing={isSyncing} />
              <KanbanBoard
                tasks={tasks}
                onToggleComplete={handleToggleComplete}
                onDelete={handleDeleteTask}
                onCreateMeet={handleCreateMeetSpace}
                onCreateGoogleTask={handleCreateGoogleTask}
                onManageRegistration={setTaskToManageRegistration}
                onUpdateStage={handleUpdateStage}
                onClearDone={handleClearDoneTasks}
                isSyncing={isSyncing}
              />
            </div>
          </div>
        ) : activeView === "classroom" ? (
          <ClassroomDashboard
            user={user}
            token={token}
            onSyncClassroomTasks={handleSyncClassroomTasks}
          />
        ) : activeView === "calendar" ? (
          <CalendarDashboard
            tasks={tasks}
            onAddTask={handleAddTask}
            onToggleComplete={handleToggleComplete}
            isSyncing={isSyncing}
          />
        ) : activeView === "settings" ? (
          <SettingsDashboard 
            onOpenDebug={() => setActiveView("debug")} 
            settings={settings}
            updateSettings={updateSettings}
          />
        ) : activeView === "debug" ? (
          <DebugDashboard 
            user={user}
            tasks={tasks}
            token={token}
            calendarEvents={calendarEvents}
          />
        ) : (
          <SelfDirectedActivityDashboard 
            user={user} 
            tasks={filteredTasks}
            token={token}
            calendarEvents={calendarEvents}
            onAddTask={handleAddTask}
            onFetchCalendarEvents={handleFetchCalendarEvents}
            onSyncGoogleTasks={handleSyncGoogleTasks}
            onToggleComplete={handleToggleComplete}
            settings={settings}
            isSyncing={isSyncing}
          />
        )}
      </main>

      {/* Task Deletion Confirmation Dialog Component */}
      <AnimatePresence>
        {taskToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTaskToDelete(null)}
              className="absolute inset-0 bg-neutral-950/40 backdrop-blur-xs"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-natural-border bg-white p-6 shadow-xl"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-natural-text-dark">
                    Delete Task
                  </h3>
                  <p className="mt-2 text-xs text-natural-text-primary leading-relaxed break-words">
                    Are you sure you want to delete <span className="font-semibold text-natural-text-dark">"{taskToDelete.title}"</span>?
                  </p>
                  {(taskToDelete.googleEventId || taskToDelete.googleTaskId) && (
                    <div className="mt-3 rounded-xl bg-natural-panel p-2.5 border border-natural-border/60">
                      <p className="font-mono text-[9px] uppercase tracking-wider font-bold text-natural-text-dark mb-1">
                        Workspace Sync Actions
                      </p>
                      <ul className="list-disc pl-3.5 text-[10px] text-natural-text-primary space-y-0.5">
                        {taskToDelete.googleEventId && (
                          <li>Remove associated event from Google Calendar</li>
                        )}
                        {taskToDelete.googleTaskId && (
                          <li>Delete synced task in Google Tasks</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setTaskToDelete(null)}
                  className="rounded-full border border-natural-border bg-white px-3.5 py-1.5 font-medium text-natural-text-primary transition-all hover:bg-neutral-50 active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => performDeleteTask(taskToDelete)}
                  disabled={isSyncing}
                  className="flex items-center gap-1 rounded-full bg-red-600 px-3.5 py-1.5 font-semibold text-white transition-all hover:bg-red-700 active:scale-95 disabled:bg-red-300 cursor-pointer"
                >
                  {isSyncing && (
                    <span className="h-3 w-3 animate-spin rounded-full border border-neutral-300 border-t-white" />
                  )}
                  Delete Task
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {taskToManageRegistration && (
          <RegistrationFormBuilder
            task={taskToManageRegistration}
            user={user}
            onClose={() => setTaskToManageRegistration(null)}
          />
        )}

        {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowImportModal(false)}
              className="absolute inset-0 bg-neutral-950/40 backdrop-blur-xs"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl border border-natural-border bg-white p-6 shadow-xl flex flex-col max-h-[80vh]"
            >
              <div className="flex items-start gap-3 pb-4 border-b border-natural-border">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-natural-accent-light text-natural-accent">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-natural-text-dark">
                    Import Calendar Events
                  </h3>
                  <p className="mt-1 text-xs text-natural-text-secondary leading-relaxed">
                    Import existing events from your Google Calendar straight into Taskspace.
                  </p>
                </div>
              </div>

              {calendarError ? (
                <div className="my-6 rounded-2xl bg-red-50 p-4 border border-red-100 flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-red-700 leading-relaxed font-semibold">
                    {calendarError}
                  </div>
                </div>
              ) : null}

              {/* Event lists */}
              {!calendarError && (
                <div className="overflow-y-auto my-4 py-2 flex-1 space-y-3 pr-1">
                  {calendarEvents.length === 0 ? (
                    <div className="py-12 text-center text-natural-text-secondary">
                      <p className="text-sm font-medium text-natural-text-dark">No upcoming events found</p>
                      <p className="mt-1 text-xs text-natural-text-secondary">
                        We couldn't locate any upcoming events on your primary Google Calendar.
                      </p>
                    </div>
                  ) : (
                    <div>
                      {/* Filter events that are not yet imported */}
                      {(() => {
                        const importedIds = new Set(
                          tasks
                            .map((t) => t.googleEventId)
                            .filter(Boolean)
                        );
                        const filteredEvents = calendarEvents.filter(
                          (event) => !importedIds.has(event.id)
                        );

                        if (filteredEvents.length === 0) {
                          return (
                            <div className="py-8 text-center text-natural-text-secondary">
                              <p className="text-sm font-semibold text-natural-text-dark">All events already synced</p>
                              <p className="mt-1 text-xs text-natural-text-secondary">
                                Everything matches up of your {calendarEvents.length} calendar events!
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-3">
                            {filteredEvents.map((event) => {
                              const isImporting = importingEventIds.includes(event.id);
                              
                              // Format date/time
                              let formattedTiming = "No date scheduled";
                              if (event.start) {
                                const startDate = event.start.dateTime || event.start.date;
                                try {
                                  const d = new Date(startDate);
                                  const options: Intl.DateTimeFormatOptions = {
                                    month: "short",
                                    day: "numeric",
                                  };
                                  if (event.start.dateTime) {
                                    options.hour = "2-digit";
                                    options.minute = "2-digit";
                                  }
                                  formattedTiming = d.toLocaleDateString("en-US", options);
                                } catch {
                                  formattedTiming = startDate;
                                }
                              }

                              return (
                                <div
                                  key={event.id}
                                  className="flex items-center justify-between gap-4 p-3.5 rounded-2xl border border-natural-border/70 hover:bg-[#FAF9F6] transition-colors"
                                >
                                  <div className="min-w-0 flex-1">
                                    <h4 className="text-sm font-semibold text-natural-text-dark truncate">
                                      {event.summary || "Untitled Event"}
                                    </h4>
                                    {event.description && (
                                      <p className="text-xs text-natural-text-secondary truncate mt-0.5 max-h-12 line-clamp-2">
                                        {event.description}
                                      </p>
                                    )}
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                      <span className="inline-flex items-center gap-1 bg-natural-accent-light px-2 py-0.5 rounded-md text-[10px] font-semibold text-natural-accent">
                                        {formattedTiming}
                                      </span>
                                      {event.hangoutLink && (
                                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                                          Meet link included
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleImportEvent(event)}
                                    disabled={isImporting}
                                    className="shrink-0 inline-flex items-center gap-1 rounded-full bg-natural-accent px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-natural-accent-hover active:scale-95 disabled:bg-neutral-300 disabled:cursor-not-allowed cursor-pointer shadow-md"
                                  >
                                    {isImporting ? (
                                      <span className="h-3.5 w-3.5 animate-spin rounded-full border border-neutral-300 border-t-white" />
                                    ) : (
                                      <span>Import</span>
                                    )}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end pt-4 border-t border-natural-border text-xs mt-auto">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="rounded-full border border-natural-border bg-white px-5 py-2 font-semibold text-natural-text-primary transition-all hover:bg-neutral-50 active:scale-95 cursor-pointer shadow-xs"
                >
                  Close Panel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
