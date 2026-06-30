import React, { useEffect, useState } from "react";
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { db, getAccessToken, handleFirestoreError, OperationType } from "../lib/firebase";
import { Task, FormSchema, FormField } from "../types";
import { User } from "firebase/auth";
import { Sparkles, Calendar, Link, Clipboard, Check, Users, Trash2, X, Eye, FileSpreadsheet, RefreshCcw, AlertTriangle, Mail, Send } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { createGoogleForm, syncGoogleFormFields, fetchGoogleFormResponses } from "../lib/forms";
import { sendGmailMessage } from "../lib/gmail";
import { getCached, setCached } from "../lib/cache";

interface RegistrationFormBuilderProps {
  task: Task;
  user: User;
  onClose: () => void;
}

export const RegistrationFormBuilder: React.FC<RegistrationFormBuilderProps> = ({ task, user, onClose }) => {
  const [formSchema, setFormSchema] = useState<FormSchema | null>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewFields, setPreviewFields] = useState<FormField[] | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"builder" | "registrants">("builder");
  const [isExportingGoogleForm, setIsExportingGoogleForm] = useState(false);
  const [googleFormError, setGoogleFormError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [loading, setLoading] = useState(true);

  // Google Forms API responses state
  const [googleFormResponses, setGoogleFormResponses] = useState<any[]>([]);
  const [googleFormQuestions, setGoogleFormQuestions] = useState<any[]>([]);
  const [loadingGoogleResponses, setLoadingGoogleResponses] = useState(false);
  const [googleResponsesError, setGoogleResponsesError] = useState<string | null>(null);

  // Email Broadcast State Variables
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBodyText, setEmailBodyText] = useState("");
  const [isSendingEmails, setIsSendingEmails] = useState(false);
  const [emailSendProgress, setEmailSendProgress] = useState<{ current: number; total: number; status: string } | null>(null);
  const [emailSuccessMessage, setEmailSuccessMessage] = useState<string | null>(null);
  const [emailErrorMessage, setEmailErrorMessage] = useState<string | null>(null);

  // Helper to discover all valid emails from both local submissions and Google Forms submissions.
  const getDiscoveredEmails = (): string[] => {
    const emailSet = new Set<string>();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // 1. Check Google Form responses
    googleFormResponses.forEach((res) => {
      if (res.answers) {
        Object.values(res.answers).forEach((val: any) => {
          const str = String(val).trim();
          if (emailRegex.test(str)) {
            emailSet.add(str);
          }
        });
      }
    });

    // 2. Check local Firestore registrations
    registrations.forEach((reg) => {
      if (reg.formData) {
        Object.values(reg.formData).forEach((val: any) => {
          const str = String(val).trim();
          if (emailRegex.test(str)) {
            emailSet.add(str);
          }
        });
      }
    });

    return Array.from(emailSet);
  };

  const handleOpenEmailModal = () => {
    const defaultSubject = `Update: "${task.title}" Event Collaboration Details`;
    
    let defaultBody = `Hello!\n\nThis is an update regarding our upcoming event: "${task.title}".\n\n`;
    if (task.dueDate) {
      const d = new Date(task.dueDate);
      defaultBody += `📅 Scheduled: ${d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}\n`;
    }
    if (task.meetLink) {
      defaultBody += `💻 Google Meet Room: ${task.meetLink}\n`;
    }
    defaultBody += `\nWe are looking forward to having you! If you have any questions, feel free to reply directly to this email.\n\nBest regards,\n${user.displayName || user.email}`;

    setEmailSubject(defaultSubject);
    setEmailBodyText(defaultBody);
    setEmailSuccessMessage(null);
    setEmailErrorMessage(null);
    setEmailSendProgress(null);
    setShowEmailModal(true);
  };

  const handleSendEmails = async () => {
    const targets = getDiscoveredEmails();
    if (targets.length === 0) {
      setEmailErrorMessage("No registered email addresses found to send updates to.");
      return;
    }

    setIsSendingEmails(true);
    setEmailErrorMessage(null);
    setEmailSuccessMessage(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error("Credentials session not active, please re-authenticate.");
      }

      for (let i = 0; i < targets.length; i++) {
        const email = targets[i];
        setEmailSendProgress({
          current: i + 1,
          total: targets.length,
          status: `Delivering to ${email}...`,
        });

        // Convert the text body containing newlines to friendly HTML format
        const bodyHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #f0f0f0; border-radius: 16px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="font-size: 28px;">📅</span>
              <h2 style="margin: 8px 0 0; color: #111111; font-weight: 700; font-size: 20px;">Event Updates</h2>
              <p style="margin: 4px 0 0; color: #666666; font-size: 13px;">Taskspace Event Collaboration Hub</p>
            </div>
            
            <div style="background-color: #FAF9F6; border: 1px solid #e5e5e0; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
              <h3 style="margin: 0 0 12px; color: #8F5E15; font-size: 14px; text-transform: uppercase; font-family: monospace; letter-spacing: 1px;">Event Details</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr>
                  <td style="padding: 4px 0; color: #666666; width: 100px; font-weight: 500;">Title:</td>
                  <td style="padding: 4px 0; color: #111111; font-weight: 600;">${task.title}</td>
                </tr>
                ${task.dueDate ? `
                <tr>
                  <td style="padding: 4px 0; color: #666666; width: 100px; font-weight: 500;">When:</td>
                  <td style="padding: 4px 0; color: #111111; font-weight: 600;">${new Date(task.dueDate).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                </tr>
                ` : ""}
                ${task.meetLink ? `
                <tr>
                  <td style="padding: 4px 0; color: #666666; width: 100px; font-weight: 500;">Meet Link:</td>
                  <td style="padding: 4px 0;"><a href="${task.meetLink}" style="color: #6d7857; font-weight: 600; text-decoration: none;">Join Google Meet Room</a></td>
                </tr>
                ` : ""}
              </table>
            </div>
            
            <div style="color: #222222; font-size: 14px; line-height: 1.6; min-height: 100px; margin-bottom: 24px; white-space: pre-wrap;">
              ${emailBodyText.replace(/\n/g, "<br />")}
            </div>

            <div style="border-top: 1px solid #f0f0f0; padding-top: 16px; font-size: 11px; color: #999999; text-align: center;">
              This email was sent via Taskspace Integration regarding the event <strong>${task.title}</strong>.
            </div>
          </div>
        `;

        await sendGmailMessage(token, email, emailSubject, bodyHtml);
      }

      setEmailSuccessMessage(`Successfully broadcasted emails to ${targets.length} registered event participants!`);
      setEmailSendProgress(null);
    } catch (err: any) {
      console.error("Failed to send updates:", err);
      setEmailErrorMessage(err.message || "An error occurred while sending group emails with Gmail.");
    } finally {
      setIsSendingEmails(false);
    }
  };

  const handleFetchGoogleResponses = async () => {
    if (!formSchema?.googleFormId) return;
    setLoadingGoogleResponses(true);
    setGoogleResponsesError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error("Session credentials not active. Please interact with calendar or tasks to authenticate.");
      }
      const data = await fetchGoogleFormResponses(token, formSchema.googleFormId);
      setGoogleFormQuestions(data.questions);
      setGoogleFormResponses(data.responses);
    } catch (err: any) {
      console.error("Failed to load responses:", err);
      setGoogleResponsesError(
        "Could not load Google Form responses automatically. Ensure that the form is linked and accepting submissions, and that you are signed in."
      );
    } finally {
      setLoadingGoogleResponses(false);
    }
  };

  useEffect(() => {
    if (activeTab === "registrants" && formSchema?.googleFormId) {
      handleFetchGoogleResponses();
    }
  }, [activeTab, formSchema?.googleFormId]);

  // Sharing coordinates
  const shareUrl = `${window.location.origin}/?register=${task.id}`;

  // 1. Listen/Fetch existing registration form schema
  useEffect(() => {
    const fetchSchema = async () => {
      try {
        setLoading(true);
        const docRef = doc(db, "registration_forms", task.id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const schema = docSnap.data() as FormSchema;
          setFormSchema(schema);
          setPreviewFields(schema.fields);
          setActiveTab("registrants"); // If setup exists, show attendees first
        } else {
          setFormSchema(null);
          setPreviewFields(null);
          setActiveTab("builder");
        }
      } catch (err) {
        console.error("Error reading form schema:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSchema();
  }, [task.id]);

  // 2. Listen to registration responses for this event
  useEffect(() => {
    const q = query(
      collection(db, "registrations"),
      where("taskId", "==", task.id),
      where("userId", "==", user.uid)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((snap) => {
          list.push({ id: snap.id, ...snap.data() });
        });
        setRegistrations(list);
      },
      (err) => {
        console.error("Error listening to registrations:", err);
        handleFirestoreError(err, OperationType.LIST, `registrations`);
      }
    );

    return () => unsubscribe();
  }, [task.id, user.uid]);

  // Handle call to Express Gemini API proxy
  const handleGenerateForm = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setGenerationError(null);
    setPreviewFields(null);

    try {
      const cacheKey = `generate-form-${task.id}-${prompt.trim()}`;
      let cachedFields = getCached<FormField[]>(cacheKey);

      if (!cachedFields) {
        const response = await fetch("/api/generate-form", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            title: task.title,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Form generation target content errored.");
        }

        const data = await response.json();
        if (data && data.fields) {
          cachedFields = data.fields;
          setCached(cacheKey, cachedFields);
        } else {
          throw new Error("Invalid output format returned by the model.");
        }
      }
      
      if (cachedFields) {
        setPreviewFields(cachedFields);
      }
    } catch (err: any) {
      console.error("Form generation failed:", err);
      setGenerationError(err.message || "Something went wrong while composing form fields.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Save/Activate complete configuration inside Cloud Firestore
  const handleSaveForm = async () => {
    if (!previewFields) return;
    setIsSaving(true);
    try {
      const schemaDocRef = doc(db, "registration_forms", task.id);
      const newSchema: FormSchema = {
        taskId: task.id,
        userId: user.uid,
        title: task.title,
        description: task.description || "",
        meetLink: task.meetLink || null,
        fields: previewFields,
        googleFormUrl: formSchema?.googleFormUrl || null,
        googleFormId: formSchema?.googleFormId || null,
      };

      await setDoc(schemaDocRef, newSchema);
      setFormSchema(newSchema);
      setActiveTab("registrants");
    } catch (err) {
      console.error("Failed to commit schema document:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Synchronize fields directly to Google Forms using Google forms REST API
  const handleExportGoogleForm = async () => {
    const fieldsToSync = previewFields || formSchema?.fields;
    if (!fieldsToSync || fieldsToSync.length === 0) {
      setGoogleFormError("No fields are currently available to synchronize.");
      return;
    }

    setIsExportingGoogleForm(true);
    setGoogleFormError(null);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error(
          "Google Auth token was not found in cache. Sign out and sign in again to verify permissions."
        );
      }

      // Create official Google Form outline (Google Forms API only lets you set title on creation)
      const { formId, responderUri } = await createGoogleForm(
        accessToken,
        task.title
      );

      // Populate Google Form outline with questions and update its description
      await syncGoogleFormFields(accessToken, formId, fieldsToSync, task.description || undefined);

      // Persist form credentials locally in formSchema doc
      const schemaDocRef = doc(db, "registration_forms", task.id);
      const updatedSchema: FormSchema = {
        taskId: task.id,
        userId: user.uid,
        title: task.title,
        description: task.description || "",
        meetLink: task.meetLink || null,
        fields: fieldsToSync,
        googleFormUrl: responderUri,
        googleFormId: formId,
      };

      await setDoc(schemaDocRef, updatedSchema);
      setFormSchema(updatedSchema);
      setPreviewFields(fieldsToSync);
      setActiveTab("registrants");
    } catch (err: any) {
      console.error("Google Forms Sync Error:", err);
      setGoogleFormError(err.message || "Failed to sync to Google Forms. Ensure scopes consent has been completed.");
    } finally {
      setIsExportingGoogleForm(false);
    }
  };

  // Delete setup entirely
  const handleDeleteSetup = async () => {
    try {
      await deleteDoc(doc(db, "registration_forms", task.id));
      setFormSchema(null);
      setPreviewFields(null);
      setShowDeleteConfirm(false);
      setActiveTab("builder");
    } catch (err: any) {
      console.error("Failed to deactivate setup:", err);
      handleFirestoreError(err, OperationType.DELETE, `registration_forms/${task.id}`);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Export registrations as CSV format
  const handleExportCSV = () => {
    if (!formSchema || registrations.length === 0) return;

    const headers = ["Registration ID", ...formSchema.fields.map((f) => f.label), "Submitted At"];
    const rows = registrations.map((reg) => {
      const date = reg.createdAt?.toDate ? reg.createdAt.toDate().toISOString() : new Date().toISOString();
      const rowVals = formSchema.fields.map((f) => {
        const val = reg.formData?.[f.id];
        if (typeof val === "boolean") return val ? "Yes" : "No";
        return val || "";
      });
      return [reg.id, ...rowVals, date];
    });

    const csvContent = [headers, ...rows]
      .map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${task.title.replace(/\s+/g, "_")}_attendees.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-neutral-950/40 backdrop-blur-xs" onClick={onClose} />

      {/* Main Drawer Shell */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 15 }}
        transition={{ duration: 0.2 }}
        className="relative flex h-[85vh] w-full max-w-2xl flex-col rounded-3xl border border-natural-border bg-white shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-natural-border bg-neutral-50/50 dark:bg-[#0e0e0e] p-5">
          <div className="min-w-0">
            <span className="font-mono text-[9px] uppercase tracking-wider font-bold text-natural-accent bg-natural-accent-light/60 px-2.5 py-0.5 rounded-full">
              AI Registration Suite
            </span>
            <h2 className="mt-1 text-sm font-semibold text-natural-text-dark break-words max-w-[400px]">
              {task.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-natural-border p-1.5 text-natural-text-secondary transition-colors hover:bg-neutral-100 hover:text-natural-text-dark cursor-pointer active:scale-95"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Tab Controls (Builders vs Attendees List) */}
        {formSchema && (
          <div className="flex shrink-0 border-b border-natural-border px-6 py-2.5 bg-white dark:bg-[#070606] text-xs gap-4">
            <button
              onClick={() => setActiveTab("registrants")}
              className={`pb-1.5 font-bold transition-all border-b-2 cursor-pointer outline-none ${
                activeTab === "registrants"
                  ? "border-natural-accent text-natural-accent"
                  : "border-transparent text-natural-text-secondary hover:text-natural-text-dark"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                Google Form Hub
              </div>
            </button>
            <button
              onClick={() => setActiveTab("builder")}
              className={`pb-1.5 font-bold transition-all border-b-2 cursor-pointer outline-none ${
                activeTab === "builder"
                  ? "border-natural-accent text-natural-accent"
                  : "border-transparent text-natural-text-secondary hover:text-natural-text-dark"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" />
                Edit Fields Setup
              </div>
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-[#121111] min-h-0 text-xs">
          {loading ? (
            <div className="flex h-full flex-col items-center justify-center gap-2.5">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-200 border-t-natural-accent" />
              <span className="font-mono text-[9px] tracking-widest text-natural-text-secondary uppercase">
                Acquiring config...
              </span>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {activeTab === "builder" ? (
                <motion.div
                  key="tab-builder"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-6"
                >
                  {/* Requirements prompt Textarea */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-natural-text-dark">
                      Describe what information you need from registrants:
                    </label>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="e.g., I need their full name, organization, direct email address, what dietary requirements they have, and if they will speak or present."
                      rows={3}
                      className="w-full rounded-2xl border border-natural-border p-3.5 text-xs text-natural-text-dark outline-none bg-white transition-all focus:ring-1 focus:ring-natural-accent focus:border-natural-accent resize-none placeholder:text-gray-400"
                    />
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={handleGenerateForm}
                        disabled={isGenerating || !prompt.trim()}
                        className="flex items-center gap-1.5 rounded-full bg-natural-accent px-4 py-2 font-semibold text-white tracking-wide shadow-xs hover:bg-natural-accent-hover transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {isGenerating ? (
                          <>
                            <span className="h-3 w-3 animate-spin rounded-full border border-neutral-300 border-t-white" />
                            Analyzing with AI...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5" />
                            Compose Form
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Generation failure feedback */}
                  {generationError && (
                    <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-600">
                      {generationError}
                    </div>
                  )}

                  {/* Dynamic Fields Live Preview */}
                  {previewFields && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border-t border-natural-border pt-6 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-natural-text-dark bg-neutral-100 border border-neutral-200 px-2.5 py-1 rounded-md">
                          Live Schema Preview
                        </span>
                        <span className="text-[10px] text-natural-text-secondary bg-[#F2F4EE] rounded-full px-2.5 py-0.5 border border-[#E4E9DC]">
                          {previewFields.length} Generated Inputs
                        </span>
                      </div>

                      {/* Render simulated Form layout */}
                      <div className="space-y-4 rounded-2xl border border-natural-border p-4 bg-[#FAF9F6]">
                        {previewFields.map((field) => (
                          <div key={field.id} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-natural-text-dark">
                                {field.label}{" "}
                                {field.required && <span className="text-red-500">*</span>}
                              </span>
                              <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-white border border-natural-border text-natural-text-secondary font-bold">
                                {field.type}
                              </span>
                            </div>

                            {field.type === "text" || field.type === "email" ? (
                              <input
                                disabled
                                placeholder={field.placeholder || "Attendees will type their answer..."}
                                className="w-full rounded-xl border border-gray-300 px-3 py-2 bg-white text-xs opacity-75 placeholder:text-gray-400 cursor-not-allowed"
                              />
                            ) : field.type === "select" ? (
                              <select
                                disabled
                                className="w-full rounded-xl border border-gray-300 px-3 py-2 bg-white text-xs opacity-75 cursor-not-allowed text-gray-400"
                              >
                                <option>Choices: {field.options?.join(", ")}</option>
                              </select>
                            ) : field.type === "checkbox" ? (
                              <div className="flex items-start gap-2 border border-gray-200 rounded-xl p-2 bg-white opacity-75">
                                <input
                                  type="checkbox"
                                  disabled
                                  className="mt-0.5 h-3.5 w-3.5 cursor-not-allowed"
                                />
                                <span className="text-xs text-natural-text-primary">
                                  {field.placeholder || "Please confirm or check this item."}
                                </span>
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-end gap-2 text-xs pt-4 border-t border-natural-border flex-wrap">
                        <button
                          type="button"
                          onClick={() => setPreviewFields(null)}
                          disabled={isExportingGoogleForm}
                          className="rounded-full border border-natural-border bg-white px-4 py-2 font-semibold text-natural-text-primary transition-all hover:bg-neutral-50 active:scale-95 cursor-pointer shadow-xs"
                        >
                          Reset
                        </button>
                        <button
                          type="button"
                          onClick={handleExportGoogleForm}
                          disabled={isExportingGoogleForm}
                          className="flex items-center gap-1.5 rounded-full bg-purple-750 hover:bg-purple-800 px-5 py-2 font-bold text-white tracking-wide shadow-md transition-all active:scale-95 cursor-pointer"
                        >
                          {isExportingGoogleForm && (
                            <span className="h-3 w-3 animate-spin rounded-full border border-neutral-300 border-t-white animate-pulse" />
                          )}
                          Create & Link Google Form
                        </button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="tab-registrants"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-6"
                >
                  {/* Public Link Share Row */}
                  <div className="rounded-2xl border border-natural-border p-4 bg-[#F2F4EE]/60 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-natural-text-dark">Public Registration Link</p>
                      <p className="mt-1 text-[11px] text-natural-text-secondary truncate shrink-0 max-w-[420px]">
                        {shareUrl}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <a
                        href={shareUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 rounded-lg border border-natural-border bg-white px-2.5 py-1.5 text-xs text-natural-text-primary transition-all hover:bg-neutral-50 active:scale-95 cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5 text-gray-500" />
                        Preview Page
                      </a>
                      <button
                        onClick={copyToClipboard}
                        className="flex items-center gap-1.5 rounded-lg bg-natural-accent px-2.5 py-1.5 text-xs text-white transition-all hover:bg-natural-accent-hover active:scale-95 cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-white animate-pulse" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Clipboard className="h-3.5 w-3.5 text-white" />
                            Copy Link
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Google Forms Connection Management */}
                  {formSchema?.googleFormUrl ? (
                    <div className="rounded-2xl border border-purple-200 p-4 bg-purple-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block h-2 w-2 rounded-full bg-purple-600 animate-pulse" />
                          <p className="font-semibold text-purple-950 text-xs">Official Google Form Connected</p>
                        </div>
                        <p className="mt-1 text-[11px] text-purple-700 truncate shrink-0 max-w-[420px]">
                          {formSchema.googleFormUrl}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0 border-none bg-transparent">
                        <a
                          href={formSchema.googleFormUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white px-3 py-1.5 text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View Form
                        </a>
                        {formSchema.googleFormId && (
                          <a
                            href={`https://docs.google.com/forms/d/${formSchema.googleFormId}/edit`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 rounded-lg border border-purple-300 bg-white text-purple-700 px-3 py-1.5 text-xs font-semibold hover:bg-purple-50 transition-all active:scale-95 cursor-pointer"
                          >
                            Edit Fields
                          </a>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-purple-300 p-4 bg-purple-50/10 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-purple-950 text-xs">Official Google Form Integration</p>
                        <p className="mt-1 text-[11px] text-purple-700/85">
                          Push these exact fields straight to Google Forms on your Drive.
                        </p>
                      </div>
                      <div className="shrink-0">
                        <button
                          onClick={handleExportGoogleForm}
                          disabled={isExportingGoogleForm}
                          className="flex items-center gap-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white px-3.5 py-2 text-xs font-semibold shadow-xs transition-all active:scale-95 disabled:opacity-55 cursor-pointer"
                        >
                          {isExportingGoogleForm ? (
                            <>
                              <span className="h-3 w-3 animate-spin rounded-full border border-neutral-300 border-t-white" />
                              Creating...
                            </>
                          ) : (
                            <>
                              <span>Make Google Form</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {googleFormError && (
                    <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-600">
                      {googleFormError}
                    </div>
                  )}

                  {/* Event Attendees Dashboard & Communications Central */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Column 1: Forms & Spreadsheet Sync */}
                    <div className="rounded-2xl border border-purple-200 bg-purple-50/15 dark:border-natural-border/30 dark:bg-[#121111]/30 p-5 flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300">
                            <FileSpreadsheet className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-purple-950 dark:text-purple-300 font-sans">
                              Official Sheets Hub
                            </h4>
                            <p className="text-[10px] text-purple-700 dark:text-purple-400 leading-normal">
                              Manage data with your linked spreadsheet.
                            </p>
                          </div>
                        </div>

                        <div className="border-t border-purple-100/70 dark:border-natural-border/45 pt-2.5 text-[11px] text-purple-900/85 dark:text-purple-200/90 font-sans leading-relaxed">
                          <p>
                            Collect surveys, gather analytical charts, and link to a spreadsheet by going to:
                          </p>
                          <ul className="list-disc pl-4 mt-1.5 space-y-1 font-semibold text-purple-950 dark:text-purple-100">
                            <li>The linked Google Form below</li>
                            <li>The "Responses" tab at the top</li>
                            <li>"Link to Sheets" spreadsheet connector</li>
                          </ul>
                        </div>
                      </div>

                      <div className="pt-2 flex flex-wrap gap-2 justify-start font-sans">
                        {formSchema?.googleFormId && (
                          <a
                            href={`https://docs.google.com/forms/d/${formSchema.googleFormId}/edit#responses`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-bold py-2 px-3 text-[10px] shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer"
                          >
                            <FileSpreadsheet className="h-3.5 w-3.5" />
                            Open Responses Sheet
                          </a>
                        )}
                        {registrations.length > 0 && (
                          <button
                            type="button"
                            onClick={handleExportCSV}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-white dark:bg-natural-bg text-purple-700 dark:text-purple-300 dark:border-natural-border font-bold py-2 px-3 text-[10px] shadow-xs hover:bg-purple-50 dark:hover:bg-natural-accent-light transition-all active:scale-95 cursor-pointer"
                          >
                            <FileSpreadsheet className="h-3.5 w-3.5" />
                            Export Offline CSV ({registrations.length})
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Column 2: Broadcaster and Gmail triggers */}
                    <div className="rounded-2xl border border-natural-border bg-[#FBFBFA] dark:bg-[#0b0b0c] p-5 flex flex-col justify-between space-y-4 shadow-xs">
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950/20 text-purple-650 dark:text-purple-300">
                            <Mail className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-natural-text-dark font-sans">
                              Email Communications
                            </h4>
                            <p className="text-[10px] text-natural-text-secondary leading-normal">
                              Broadcast details directly to attendees.
                            </p>
                          </div>
                        </div>

                        <div className="border-t border-natural-border/60 pt-2.5 text-[11px] text-natural-text-primary leading-relaxed font-sans space-y-1.5">
                          <p>
                            We scanned live entries and offline responses for attendee emails:
                          </p>
                          <div className="grid grid-cols-2 gap-1.5 pt-1">
                            <div className="bg-white dark:bg-natural-bg/50 border border-natural-border/70 rounded-xl p-2 text-center">
                              <p className="text-[9px] text-natural-text-secondary uppercase">Google Form</p>
                              <p className="text-sm font-bold text-purple-700 dark:text-purple-300">{googleFormResponses.length}</p>
                            </div>
                            <div className="bg-white dark:bg-natural-bg/50 border border-natural-border/70 rounded-xl p-2 text-center">
                              <p className="text-[9px] text-natural-text-secondary uppercase">Local Offline</p>
                              <p className="text-sm font-bold text-purple-700 dark:text-purple-300">{registrations.length}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 font-sans">
                        <button
                          type="button"
                          onClick={handleOpenEmailModal}
                          className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-natural-accent hover:bg-natural-accent-hover text-white font-bold py-2 px-3 text-[10px] shadow-sm tracking-wide transition-all active:scale-95 cursor-pointer"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          Broadcast Email via Gmail ({getDiscoveredEmails().length})
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Google Forms Live Submissions List */}
                  {formSchema?.googleFormId && (
                    <div className="space-y-4 border-t border-natural-border/70 pt-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-natural-text-dark font-sans flex items-center gap-1.5">
                            <Users className="h-4.5 w-4.5 text-purple-600" />
                            Live Attendees List ({googleFormResponses.length})
                          </h4>
                          {loadingGoogleResponses && (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-200 border-t-purple-600" />
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={handleFetchGoogleResponses}
                          disabled={loadingGoogleResponses}
                          className="inline-flex items-center gap-1.5 bg-white border border-natural-border px-3 py-1.5 rounded-full text-[10px] font-bold text-natural-text-primary hover:bg-neutral-50 active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs whitespace-nowrap self-start sm:self-center"
                        >
                          <RefreshCcw className={`h-3 w-3 ${loadingGoogleResponses ? 'animate-spin' : ''}`} />
                          Refresh Submissions
                        </button>
                      </div>

                      {googleResponsesError ? (
                        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4 flex gap-2.5 items-start">
                          <AlertTriangle className="h-4.5 w-4.5 text-red-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-red-750 text-xs text-left">Failed to load attendees</p>
                            <p className="text-[10px] text-red-600 leading-normal mt-0.5">{googleResponsesError}</p>
                          </div>
                        </div>
                      ) : null}

                      {!googleResponsesError && !loadingGoogleResponses && googleFormResponses.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-neutral-200 py-12 px-4 text-center">
                          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-purple-50 text-purple-600">
                            <Users className="h-5 w-5" />
                          </div>
                          <p className="mt-2.5 text-xs font-semibold text-natural-text-dark">No responses received yet</p>
                          <p className="mt-1 text-[10px] text-natural-text-secondary leading-relaxed max-w-sm mx-auto">
                            Share the public link above or send the Google Form connection to your guests. When they submit, their details will display right here in real time!
                          </p>
                        </div>
                      ) : !googleResponsesError && googleFormResponses.length > 0 ? (
                        <div className="overflow-x-auto rounded-2xl border border-neutral-100 shadow-xs max-h-[380px]">
                          <table className="w-full text-left border-collapse bg-white text-xs">
                            <thead>
                              <tr className="bg-neutral-50/80 border-b border-neutral-100 font-mono text-[9px] text-neutral-500 tracking-wider uppercase">
                                <th className="p-3 font-bold">Submitted At</th>
                                {googleFormQuestions.map((q) => (
                                  <th key={q.id} className="p-3 font-bold whitespace-nowrap max-w-[200px] truncate" title={q.title}>
                                    {q.title}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                              {googleFormResponses.map((res) => {
                                let formattedTime = "Unknown";
                                if (res.submittedAt) {
                                  try {
                                    formattedTime = new Date(res.submittedAt).toLocaleString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    });
                                  } catch {
                                    formattedTime = res.submittedAt;
                                  }
                                }
                                return (
                                  <tr key={res.responseId} className="hover:bg-neutral-50/50 transition-colors">
                                    <td className="p-3 text-neutral-500 font-mono text-[10px] whitespace-nowrap">
                                      {formattedTime}
                                    </td>
                                    {googleFormQuestions.map((q) => {
                                      const ansVal = res.answers[q.title] || "-";
                                      return (
                                        <td key={q.id} className="p-3 text-natural-text-dark break-words min-w-[120px] max-w-[250px]">
                                          {ansVal}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Danger Zone Deactivate */}
                  <div className="pt-6 border-t border-natural-border bg-white">
                    {showDeleteConfirm ? (
                      <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-red-750 text-xs flex items-center gap-1.5 font-sans">
                            <Trash2 className="h-4 w-4 text-red-500" />
                            Are you absolutely sure?
                          </p>
                          <p className="text-[10px] text-red-600/90 mt-1 max-w-[400px] leading-relaxed">
                            This deactivates and removes the registration portal. Attendee lists remain intact but new signups are blocked immediately.
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(false)}
                            className="px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-neutral-700 text-xs font-semibold hover:bg-neutral-50 cursor-pointer active:scale-95 transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleDeleteSetup}
                            className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 cursor-pointer active:scale-95 transition-all"
                          >
                            Delete Portal
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-red-600 font-sans">Delete Form Setup</p>
                          <p className="text-[10px] text-natural-text-secondary">
                            Un-publish this registration portal and discard current custom layouts.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(true)}
                          className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-semibold px-3 py-2 text-xs transition-colors cursor-pointer active:scale-95"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete Portal
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Gmail Broadcast Compose Modal */}
        <AnimatePresence>
          {showEmailModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  if (!isSendingEmails) setShowEmailModal(false);
                }}
                className="absolute inset-0 bg-neutral-950/50 backdrop-blur-xs"
              />

              {/* Compose Box */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-natural-border bg-white p-6 shadow-2xl flex flex-col max-h-[85vh] z-10"
              >
                {/* Header */}
                <div className="flex items-start justify-between pb-4 border-b border-natural-border">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-650">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-natural-text-dark font-sans">
                        Broadcast Email Update
                      </h3>
                      <p className="text-[11px] text-natural-text-secondary leading-tight mt-0.5">
                        Deliver instant schedules, Meet links, and updates to guests.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isSendingEmails}
                    onClick={() => setShowEmailModal(false)}
                    className="p-1 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 disabled:opacity-50 cursor-pointer transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Body form */}
                <div className="overflow-y-auto my-4 py-2 flex-1 space-y-4 font-sans text-xs">
                  {/* Recipient summary */}
                  <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-150">
                    <p className="font-semibold text-natural-text-primary text-[11px]">
                      Recipients ({getDiscoveredEmails().length} found):
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5 max-h-[70px] overflow-y-auto pr-1">
                      {getDiscoveredEmails().map((email) => (
                        <span key={email} className="inline-flex items-center bg-white border border-neutral-200 px-2.5 py-0.5 rounded-full text-[10px] text-neutral-600">
                          {email}
                        </span>
                      ))}
                      {getDiscoveredEmails().length === 0 ? (
                        <p className="text-[10px] text-red-500 font-semibold italic">
                          No email addresses detected. Please gather Responses or signups first!
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {/* Subject input */}
                  <div className="space-y-1">
                    <label className="font-semibold text-natural-text-dark text-[11px]">Subject Title</label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="Add an email subject..."
                      disabled={isSendingEmails}
                      className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs focus:ring-1 focus:ring-purple-500 hover:border-neutral-300 transition-colors"
                    />
                  </div>

                  {/* Body text area */}
                  <div className="space-y-1">
                    <label className="font-semibold text-natural-text-dark text-[11px]">Message Content (Simple text, returns styled email)</label>
                    <textarea
                      value={emailBodyText}
                      onChange={(e) => setEmailBodyText(e.target.value)}
                      placeholder="Write your email body updates..."
                      disabled={isSendingEmails}
                      rows={8}
                      className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-sans leading-relaxed focus:ring-1 focus:ring-purple-500 hover:border-neutral-300 transition-colors bg-[#FAF9F6] resize-none"
                    />
                  </div>

                  {/* Automatic Attachments notice */}
                  <div className="flex items-center gap-1.5 p-2 bg-green-50/55 rounded-xl border border-green-100 text-[10px] text-green-700">
                    <Check className="h-3.5 w-3.5" />
                    <strong>Auto-included:</strong> Active Google Meet details, Task schedule titles, and interactive action lines.
                  </div>

                  {/* Status feedbacks */}
                  {emailSendProgress && (
                    <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-2">
                      <div className="flex justify-between font-mono text-[10px] text-blue-700 font-bold">
                        <span>{emailSendProgress.status}</span>
                        <span>{emailSendProgress.current} / {emailSendProgress.total}</span>
                      </div>
                      <div className="w-full bg-blue-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${(emailSendProgress.current / emailSendProgress.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {emailSuccessMessage && (
                    <div className="p-4 bg-green-50 rounded-2xl border border-green-150 text-xs font-semibold text-green-700 flex gap-2">
                      <Check className="h-4.5 w-4.5 shrink-0" />
                      <div>{emailSuccessMessage}</div>
                    </div>
                  )}

                  {emailErrorMessage && (
                    <div className="p-4 bg-red-50 rounded-2xl border border-red-150 text-xs font-semibold text-red-700 flex gap-2">
                      <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
                      <div>{emailErrorMessage}</div>
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="flex justify-end gap-2.5 pt-4 border-t border-natural-border text-xs mt-auto">
                  <button
                    type="button"
                    disabled={isSendingEmails}
                    onClick={() => setShowEmailModal(false)}
                    className="rounded-full border border-natural-border bg-white px-5 py-2 font-semibold text-natural-text-primary transition-all hover:bg-neutral-50 active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    disabled={isSendingEmails || getDiscoveredEmails().length === 0}
                    onClick={handleSendEmails}
                    className="inline-flex items-center gap-1.5 rounded-full bg-purple-700 hover:bg-purple-800 px-6 py-2 font-bold text-white shadow-md transition-all active:scale-95 disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSendingEmails ? (
                      <>
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border border-neutral-350 border-t-white" />
                        <span>Broadcasting...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>Send Broadcast Updates</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
