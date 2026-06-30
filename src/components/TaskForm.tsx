import React, { useState } from "react";
import { Plus, Calendar, Clock, Sparkles, Video, ListTodo, Mic, Info, Link as LinkIcon, X, Copy, Check } from "lucide-react";
import { getCached, setCached } from "../lib/cache";
import { Task } from "../types";

interface TaskFormProps {
  onAddTask: (
    title: string,
    description: string,
    dueDate?: string,
    addMeet?: boolean,
    addGoogleTask?: boolean,
    registrationFields?: any[],
    priority?: "high" | "medium" | "low",
    assigneeEmail?: string,
    workspaceTypeOverride?: "personal" | "team"
  ) => Promise<void>;
  isSyncing: boolean;
  workspaceType: "personal" | "team";
  allowWorkspaceSelection?: boolean;
  initialDate?: string; // YYYY-MM-DD
}

export const TaskForm: React.FC<TaskFormProps> = ({ onAddTask, isSyncing, workspaceType, allowWorkspaceSelection, initialDate }) => {
  // Mode selection: manual input vs AI prompt scheduler
  const [mode, setMode] = useState<"manual" | "ai">("manual");
  
  // Manual form states
  const [selectedWorkspace, setSelectedWorkspace] = useState<"personal" | "team">(workspaceType);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [hasDueDate, setHasDueDate] = useState(!!initialDate);
  const [dueDateStr, setDueDateStr] = useState(initialDate || "");
  const [dueTimeStr, setDueTimeStr] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low" | undefined>(undefined);
  const [assigneeEmail, setAssigneeEmail] = useState("");
  const [showAssignInput, setShowAssignInput] = useState(false);
  const [isCoHost, setIsCoHost] = useState(false);
  const [savedPeople, setSavedPeople] = useState<string[]>([]);
  const [addMeet, setAddMeet] = useState(false);
  const [showMeetPopup, setShowMeetPopup] = useState(false);
  const meetLink = "https://meet.google.com/xyz-abcd-efg";
  const [addGoogleTask, setAddGoogleTask] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  React.useEffect(() => {
    const saved = localStorage.getItem("savedPeople");
    if (saved) {
      try {
        setSavedPeople(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved people", e);
      }
    }
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(meetLink);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  React.useEffect(() => {
    if (initialDate) {
      setHasDueDate(true);
      setDueDateStr(initialDate);
    }
  }, [initialDate]);

  // AI assistant states
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isAutofilling, setIsAutofilling] = useState(false);
  const [isDictating, setIsDictating] = useState(false);

  const [isRecordingMemo, setIsRecordingMemo] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);

  const handleToggleVoiceMemo = async () => {
    if (isRecordingMemo) {
      // Stop recording
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      setIsRecordingMemo(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsTranscribing(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        try {
          const res = await fetch("/api/transcribe-audio", {
            method: "POST",
            headers: { "Content-Type": "audio/webm" },
            body: audioBlob,
          });

          if (res.ok) {
            const data = await res.json();
            if (data.text) {
              setDescription((prev) => (prev ? prev + " " + data.text : data.text));
            }
          }
        } catch (err) {
          console.error("Transcription failed", err);
        } finally {
          setIsTranscribing(false);
          stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start();
      setIsRecordingMemo(true);
    } catch (err) {
      console.error("Microphone access denied", err);
      alert("Microphone access is required for Voice Memo.");
    }
  };

  const handleDictate = () => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support the Web Speech API.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsDictating(true);
    };

    recognition.onresult = async (event: any) => {
      setIsDictating(false);
      const transcript = event.results[0][0].transcript;
      setAiPrompt((prev) => (prev ? prev + " " + transcript : transcript));
    };

    recognition.onerror = (event: any) => {
      setIsDictating(false);
      console.error("Speech recognition error:", event.error);
      if (event.error === 'not-allowed') {
        alert("Microphone access was denied. Please allow microphone access in your browser or open the app in a new tab.");
      }
    };

    recognition.onend = () => {
      setIsDictating(false);
    };

    recognition.start();
  };

  const handleSmartAutofill = async () => {
    if (!title.trim() || isAutofilling) return;
    setIsAutofilling(true);
    try {
      let finalDueDate: string | undefined;
      if (hasDueDate && dueDateStr) {
        if (dueTimeStr) {
          finalDueDate = `${dueDateStr}T${dueTimeStr}:00`;
        } else {
          finalDueDate = dueDateStr;
        }
      }

      const cacheKey = `autofill-${title.trim()}-${finalDueDate || 'none'}`;
      let cachedResult = getCached<any>(cacheKey);

      if (!cachedResult) {
        const res = await fetch("/api/smart-task-autofill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim(), dueDate: finalDueDate }),
        });
        if (res.ok) {
          const data = await res.json();
          cachedResult = data;
          setCached(cacheKey, data);
        }
      }

      if (cachedResult) {
        if (cachedResult.description) setDescription(cachedResult.description);
        if (cachedResult.priority) setPriority(cachedResult.priority);
      }
    } catch (err) {
      console.error("Autofill failed", err);
    } finally {
      setIsAutofilling(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "ai") {
      handleComposeWithAI();
      return;
    }
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      let finalDueDate: string | undefined;

      if (hasDueDate && dueDateStr) {
        if (dueTimeStr) {
          // Combine YYYY-MM-DD and HH:HH into ISO component
          finalDueDate = `${dueDateStr}T${dueTimeStr}:00`;
        } else {
          // Store pure date
          finalDueDate = dueDateStr;
        }
      }

      if (assigneeEmail.trim()) {
        const email = assigneeEmail.trim();
        if (!savedPeople.includes(email)) {
          const newSaved = [...savedPeople, email];
          setSavedPeople(newSaved);
          localStorage.setItem("savedPeople", JSON.stringify(newSaved));
        }
      }

      await onAddTask(title.trim(), description.trim(), finalDueDate, addMeet, addGoogleTask, undefined, priority, assigneeEmail.trim() || undefined, allowWorkspaceSelection ? selectedWorkspace : undefined);

      // Reset values
      setTitle("");
      setDescription("");
      setDueDateStr("");
      setDueTimeStr("");
      setPriority(undefined);
      setAssigneeEmail("");
      setHasDueDate(false);
      setAddMeet(false);
      setAddGoogleTask(false);
    } catch (err) {
      console.error("Form error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComposeWithAI = async () => {
    if (!aiPrompt.trim() || isAiGenerating) return;

    setIsAiGenerating(true);
    setAiError(null);

    try {
      const res = await fetch("/api/parse-event-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
      });

      if (!res.ok) {
        const errorDetail = await res.json().catch(() => ({}));
        throw new Error(errorDetail.error || "Failed to parse prompt with AI. Please check server logs.");
      }

      const data = await res.json();
      
      // Submit fully parsed parameters to parent creator handler!
      await onAddTask(
        data.title,
        data.description,
        data.dueDate || undefined,
        data.addMeet,
        data.addGoogleTask,
        data.registrationFields || [],
        data.priority,
        undefined,
        allowWorkspaceSelection ? selectedWorkspace : undefined
      );

      // Clear prompt input box on successful execution!
      setAiPrompt("");
      setMode("manual");
    } catch (err: any) {
      console.error("AI Event parsing failed:", err);
      setAiError(err.message || "An unknown error occurred while communicating with Gemini.");
    } finally {
      setIsAiGenerating(false);
    }
  };

  return (
    <div
      id="task-form-container"
      className="mb-8 rounded-2xl border border-natural-border bg-white p-6 shadow-xs transition-all duration-300 hover:shadow-md"
    >
      {/* Mode Selector Tab Bar */}
      <div className="flex border-b border-natural-border/60 pb-3 mb-5 gap-4 text-xs font-sans">
        <button
          type="button"
          onClick={() => {
            setMode("manual");
            setAiError(null);
          }}
          className={`pb-1 px-1 font-bold border-b-2 cursor-pointer transition-all duration-200 ${
            mode === "manual"
              ? "border-natural-accent text-natural-accent"
              : "border-transparent text-natural-text-secondary hover:text-natural-text-dark"
          }`}
        >
          Standard Task Setup
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("ai");
            setAiError(null);
          }}
          className={`pb-1 px-1 font-bold border-b-2 cursor-pointer transition-all duration-200 flex items-center gap-1.5 ${
            mode === "ai"
              ? "border-natural-accent text-natural-accent"
              : "border-transparent text-natural-text-secondary hover:text-natural-text-dark"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5 text-natural-accent animate-pulse" />
          AI Prompt Scheduler
        </button>
      </div>

      {mode === "ai" ? (
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-natural-text-dark flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-natural-accent" />
              Analyze event details and generate registration forms with AI:
            </label>
            <div className="relative">
              <textarea
                id="ai-event-prompt-textarea"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g., Schedule an expert panel discussion on June 10 at 4pm. Sync a Google Meet link and generate a sign-up form requesting their name, twitter handles, and areas of interest."
                rows={3}
                className="w-full rounded-2xl border border-natural-border p-3.5 pr-10 text-xs text-natural-text-dark outline-none bg-white transition-all focus:ring-1 focus:ring-natural-accent focus:border-natural-accent resize-none placeholder:text-gray-400"
              />
              <button
                type="button"
                onClick={handleDictate}
                disabled={isDictating}
                title="Dictate prompt"
                className={`absolute right-3 top-3 p-1.5 rounded-full transition-colors ${
                  isDictating ? 'text-red-500 bg-red-50 animate-pulse' : 'text-natural-text-secondary hover:bg-natural-accent/10 hover:text-natural-accent'
                }`}
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-[10px] text-natural-text-secondary leading-relaxed">
              💡 Gemini parses task fields, dates, links, and builds standard RSVP signup parameters in one continuous flow.
            </p>
          </div>

          {aiError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600">
              {aiError}
            </div>
          )}

          <div className="flex justify-end border-t border-natural-panel pt-4">
            <button
              id="submit-ai-prompt-btn"
              type="button"
              onClick={handleComposeWithAI}
              disabled={isAiGenerating || !aiPrompt.trim()}
              className="flex items-center gap-1.5 rounded-full bg-natural-accent px-4 py-2 text-xs font-semibold text-white tracking-wide shadow-xs hover:bg-natural-accent-hover transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isAiGenerating ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border border-neutral-300 border-t-white" />
                  <span>Configuring Workspace with Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                  <span>Compose Event & Form</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-4">
            {/* Title Input */}
            <div className="relative flex items-center">
              <input
                id="task-title-input"
                type="text"
                required
                placeholder="Create a new task..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border-0 border-b border-transparent bg-transparent py-1 pr-20 text-lg font-medium text-natural-text-dark placeholder-natural-text-secondary/60 focus:border-natural-accent/30 focus:outline-hidden"
              />
              <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center">
                {title.trim().length > 2 && (
                  <button
                    type="button"
                    onClick={handleSmartAutofill}
                    disabled={isAutofilling}
                    title="Auto-fill description and priority with Gemini"
                    className="p-1.5 text-natural-accent hover:bg-natural-accent/10 rounded-full transition-colors disabled:opacity-50"
                  >
                    <Sparkles className={`w-4 h-4 ${isAutofilling ? 'animate-spin' : ''}`} />
                  </button>
                )}
              </div>
            </div>

            {/* Optional Description */}
            <div className="relative">
              <textarea
                id="task-description-textarea"
                placeholder="Detail notes (optional)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={1}
                className="w-full resize-none border-0 bg-transparent text-sm text-natural-text-primary placeholder-natural-text-secondary/40 focus:outline-hidden focus:ring-0 pr-10"
              />
              <button
                type="button"
                onClick={handleToggleVoiceMemo}
                disabled={isTranscribing}
                title="Record Voice Memo for Description"
                className={`absolute right-0 top-0 p-1.5 rounded-full transition-colors ${
                  isRecordingMemo 
                    ? 'text-red-500 bg-red-50 animate-pulse' 
                    : isTranscribing
                    ? 'text-natural-accent bg-natural-accent/10 cursor-not-allowed'
                    : 'text-natural-text-secondary hover:bg-natural-accent/10 hover:text-natural-accent'
                }`}
              >
                {isTranscribing ? (
                  <Sparkles className="w-4 h-4 animate-spin" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Due Date Details */}
            {hasDueDate ? (
              <div
                id="deadline-fields"
                className="flex flex-col sm:flex-row gap-3 rounded-lg bg-natural-panel border border-natural-border/60 p-3"
              >
                {/* Date Picker */}
                <div className="flex flex-1 items-center gap-2">
                  <Calendar className="h-4 w-4 text-natural-text-secondary" />
                  <input
                    id="due-date-picker"
                    type="date"
                    required
                    value={dueDateStr}
                    onChange={(e) => setDueDateStr(e.target.value)}
                    className="w-full bg-transparent text-xs text-natural-text-primary focus:outline-hidden"
                  />
                </div>

                {/* Optional Time Picker */}
                <div className="flex flex-1 items-center gap-2 border-t border-natural-border pt-2 sm:border-t-0 sm:border-l sm:pl-3 sm:pt-0">
                  <Clock className="h-4 w-4 text-natural-text-secondary" />
                  <input
                    id="due-time-picker"
                    type="time"
                    value={dueTimeStr}
                    placeholder="Add specific time"
                    onChange={(e) => setDueTimeStr(e.target.value)}
                    className="w-full bg-transparent text-xs text-natural-text-primary focus:outline-hidden"
                  />
                </div>
              </div>
            ) : null}

            {allowWorkspaceSelection && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-natural-text-secondary font-medium">Add to:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedWorkspace("personal")}
                    className={`px-3 py-1 text-[10px] font-bold rounded-full transition-colors border ${
                      selectedWorkspace === "personal" 
                        ? "bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800" 
                        : "bg-transparent text-natural-text-secondary border-natural-border hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    }`}
                  >
                    Self-Directed (Personal)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedWorkspace("team")}
                    className={`px-3 py-1 text-[10px] font-bold rounded-full transition-colors border ${
                      selectedWorkspace === "team" 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800" 
                        : "bg-transparent text-natural-text-secondary border-natural-border hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    }`}
                  >
                    Event Management (Team)
                  </button>
                </div>
              </div>
            )}

            {(allowWorkspaceSelection ? selectedWorkspace : workspaceType) === "team" && (
              <div className="flex flex-col gap-1.5 py-1">
                {(!showAssignInput && !assigneeEmail) ? (
                  <button
                    type="button"
                    onClick={() => setShowAssignInput(true)}
                    className="flex items-center gap-1.5 w-fit px-3 py-1.5 text-xs font-medium rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 transition-colors text-natural-text-secondary hover:text-natural-text-primary"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add People
                  </button>
                ) : (
                  <div className="flex items-center gap-2 relative">
                    <input
                      type="email"
                      placeholder="Assign to (email address)"
                      value={assigneeEmail}
                      onChange={(e) => setAssigneeEmail(e.target.value)}
                      autoFocus
                      list="saved-people"
                      className="flex-1 text-sm border-0 bg-transparent placeholder-natural-text-secondary/40 focus:outline-hidden focus:ring-0"
                    />
                    <datalist id="saved-people">
                      {savedPeople.map(p => <option key={p} value={p} />)}
                    </datalist>
                    {assigneeEmail && addMeet && (
                      <label className="flex items-center gap-1.5 cursor-pointer bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1.5 rounded-md font-medium shrink-0 transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/50">
                        <input
                          type="checkbox"
                          checked={isCoHost}
                          onChange={(e) => setIsCoHost(e.target.checked)}
                          className="w-3.5 h-3.5 text-blue-600 border-blue-300 rounded-sm focus:ring-blue-500 bg-white"
                        />
                        <span className="text-xs">Co-host</span>
                      </label>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Priority Selection */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-natural-text-secondary font-medium">Priority:</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPriority(priority === "high" ? undefined : "high")}
                  className={`px-3 py-1 text-[10px] font-bold rounded-full transition-colors border ${
                    priority === "high" 
                      ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:border-red-800" 
                      : "bg-transparent text-natural-text-secondary border-natural-border hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  }`}
                >
                  High
                </button>
                <button
                  type="button"
                  onClick={() => setPriority(priority === "medium" ? undefined : "medium")}
                  className={`px-3 py-1 text-[10px] font-bold rounded-full transition-colors border ${
                    priority === "medium" 
                      ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-500" 
                      : "bg-transparent text-natural-text-secondary border-natural-border hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  }`}
                >
                  Medium
                </button>
                <button
                  type="button"
                  onClick={() => setPriority(priority === "low" ? undefined : "low")}
                  className={`px-3 py-1 text-[10px] font-bold rounded-full transition-colors border ${
                    priority === "low" 
                      ? "bg-green-50 text-green-600 border-green-200 dark:bg-green-900/30 dark:border-green-800" 
                      : "bg-transparent text-natural-text-secondary border-natural-border hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  }`}
                >
                  Low
                </button>
              </div>
            </div>

            {/* Actions bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between border-t border-natural-panel pt-4">
              <div className="flex flex-wrap gap-2">
                <button
                  id="toggle-deadline-btn"
                  type="button"
                  onClick={() => setHasDueDate(!hasDueDate)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                    hasDueDate
                      ? "bg-natural-accent text-white"
                      : "bg-natural-accent-light text-natural-text-primary hover:bg-natural-border"
                  }`}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  {hasDueDate ? "Remove Deadline" : "Add Deadline & Sync"}
                </button>

                <label
                  htmlFor="toggle-meet-checkbox"
                  className="flex items-center gap-2 cursor-pointer group rounded-full px-3 py-1.5 transition-all duration-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <div className="relative flex items-center">
                    <input
                      id="toggle-meet-checkbox"
                      type="checkbox"
                      className="sr-only peer"
                      checked={addMeet}
                      onChange={(e) => {
                        setAddMeet(e.target.checked);
                        if (e.target.checked) {
                          setShowMeetPopup(true);
                        } else {
                          setShowMeetPopup(false);
                        }
                      }}
                    />
                    <div className="w-8 h-4 bg-neutral-300 dark:bg-neutral-600 rounded-full peer peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-500"></div>
                  </div>
                  <span className={`text-xs font-medium flex items-center gap-1.5 transition-colors ${addMeet ? 'text-blue-600 dark:text-blue-400' : 'text-natural-text-secondary'}`}>
                    <Video className="h-3.5 w-3.5" />
                    {addMeet ? "Google Meet Added" : "Add Google Meet"}
                  </span>
                  {addMeet && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowMeetPopup(true);
                      }}
                      className="text-blue-500 hover:text-blue-700 ml-1"
                      title="View Meet Link"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  )}
                </label>

                <label
                  htmlFor="toggle-tasks-checkbox"
                  className="flex items-center gap-2 cursor-pointer group rounded-full px-3 py-1.5 transition-all duration-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <div className="relative flex items-center">
                    <input
                      id="toggle-tasks-checkbox"
                      type="checkbox"
                      className="sr-only peer"
                      checked={addGoogleTask}
                      onChange={() => setAddGoogleTask(!addGoogleTask)}
                    />
                    <div className="w-8 h-4 bg-neutral-300 dark:bg-neutral-600 rounded-full peer peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
                  </div>
                  <span className={`text-xs font-medium flex items-center gap-1.5 transition-colors ${addGoogleTask ? 'text-emerald-600 dark:text-emerald-400' : 'text-natural-text-secondary'}`}>
                    <ListTodo className="h-3.5 w-3.5" />
                    {addGoogleTask ? "Google Task Added" : "Sync Google Task"}
                  </span>
                </label>
              </div>

              <button
                id="submit-task-btn"
                type="submit"
                disabled={!title.trim() || isSubmitting}
                className="flex items-center justify-center gap-1.5 rounded-full bg-natural-accent px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all duration-250 hover:bg-natural-accent-hover focus:ring-2 focus:ring-natural-border disabled:bg-natural-accent-light disabled:text-natural-text-secondary/40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="h-3 w-3 animate-spin rounded-full border border-neutral-300 border-t-white" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                Add Task
              </button>
            </div>
          </div>
        </form>
      )}

      {showMeetPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#0b0b0c] border border-natural-border rounded-2xl shadow-xl w-full max-w-sm relative flex flex-col">
            <div className="p-4 border-b border-natural-border flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Video className="w-4 h-4 text-blue-500" /> Google Meet Link
              </h3>
              <button 
                onClick={() => setShowMeetPopup(false)}
                className="text-xs font-medium text-natural-text-secondary hover:text-natural-text-primary p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <p className="text-sm text-natural-text-secondary">
                A Google Meet link will be generated and attached to this task:
              </p>
              <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-natural-border">
                <LinkIcon className="w-4 h-4 text-blue-500 shrink-0" />
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400 break-all flex-1">
                  {meetLink}
                </span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="p-1.5 text-natural-text-secondary hover:text-natural-text-primary hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-md transition-colors"
                  title="Copy Link"
                >
                  {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={() => setShowMeetPopup(false)}
                className="mt-2 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
