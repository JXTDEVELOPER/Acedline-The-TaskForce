import React, { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { AlertCircle, CalendarDays, Video, ArrowLeft, ExternalLink, Sun, Moon } from "lucide-react";
import { motion } from "motion/react";

interface Field {
  id: string;
  label: string;
  type: "text" | "email" | "checkbox" | "select";
  options?: string[];
  required: boolean;
  placeholder?: string;
}

interface FormSchema {
  taskId: string;
  userId: string;
  title: string;
  description?: string;
  meetLink?: string | null;
  fields: Field[];
  googleFormUrl?: string | null;
  googleFormId?: string | null;
}

interface RegistrationPageProps {
  taskId: string;
  onBackToDashboard?: () => void;
  theme?: "light" | "dark";
  toggleTheme?: () => void;
}

export const RegistrationPage: React.FC<RegistrationPageProps> = ({
  taskId,
  onBackToDashboard,
  theme,
  toggleTheme,
}) => {
  const [formSchema, setFormSchema] = useState<FormSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch registration form schema from Firestore
  useEffect(() => {
    const fetchSchema = async () => {
      try {
        setLoading(true);
        setError(null);
        const docRef = doc(db, "registration_forms", taskId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as FormSchema;
          setFormSchema(data);
        } else {
          setError(
            "This event registration page has not been configured with Google Forms yet."
          );
        }
      } catch (err: any) {
        console.error("Error fetching form schema:", err);
        setError("Unable to load event details. Please verify your connection.");
      } finally {
        setLoading(false);
      }
    };

    fetchSchema();
  }, [taskId]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-natural-bg p-6 antialiased">
        <div className="flex flex-col items-center gap-3">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-natural-accent" />
          <span className="font-mono text-xs text-natural-text-secondary tracking-widest uppercase">
            Opening Registration Portal...
          </span>
        </div>
      </div>
    );
  }

  if (error || !formSchema) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-natural-bg px-6 py-12 antialiased">
        <div className="w-full max-w-md rounded-2xl border border-natural-border bg-white p-8 text-center shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-sm font-semibold text-natural-text-dark">
            Setup Needed
          </h2>
          <p className="mt-2 text-xs text-natural-text-secondary leading-relaxed">
            {error || "The Google Form setup is currently missing."}
          </p>
          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-natural-border bg-white px-4 py-2 text-xs font-semibold text-natural-text-primary transition-all hover:bg-neutral-50 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Dashboard
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-natural-bg px-4 py-12 text-natural-text-primary antialiased font-sans relative">
      {toggleTheme && (
        <div className="absolute top-4 right-4">
          <button
            onClick={toggleTheme}
            title={theme === "light" ? "Switch to Night Mode" : "Switch to Light Mode"}
            className="rounded-full border border-natural-border bg-white p-2 text-natural-text-secondary shadow-xs hover:bg-natural-accent-light hover:text-natural-accent transition-all active:scale-95 cursor-pointer animate-fade-in"
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
        </div>
      )}
      <div className="mx-auto max-w-md">
        {onBackToDashboard && (
          <button
            onClick={onBackToDashboard}
            className="mb-6 inline-flex items-center gap-1.5 text-xs text-natural-text-secondary transition-colors hover:text-natural-text-dark cursor-pointer font-semibold"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
        )}

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-3xl border border-natural-border bg-white p-6 sm:p-8 shadow-md"
        >
          {/* Header */}
          <div className="mb-6 pb-6 border-b border-natural-border">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1 text-[10px] font-bold text-purple-700 tracking-wider uppercase">
                Official Google Form
              </span>
            </div>
            
            <h1 className="text-2xl font-bold tracking-tight text-natural-text-dark break-words">
              {formSchema.title}
            </h1>
            {formSchema.description && (
              <p className="mt-3 text-xs text-natural-text-secondary leading-relaxed break-words whitespace-pre-line">
                {formSchema.description}
              </p>
            )}
          </div>

          {/* Action Center */}
          <div className="space-y-4">
            {formSchema.googleFormUrl ? (
              <div className="rounded-2xl border border-purple-200 bg-purple-50/30 p-5 text-center">
                <p className="text-xs font-semibold text-purple-950 mb-1">
                  Secure Attendee Signup
                </p>
                <p className="text-[11px] text-purple-700 font-medium mb-4 leading-relaxed">
                  Please click the link below to load and complete your registration details securely using our authorized Google Forms sheet.
                </p>
                <a
                  href={formSchema.googleFormUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold py-3 px-4 text-xs transition-all active:scale-98 cursor-pointer shadow-sm"
                >
                  Fill out on Google Forms
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            ) : (
              <div className="rounded-2xl border border-natural-border bg-[#FAF9F6] p-5 text-center">
                <p className="text-xs font-semibold text-natural-text-dark">
                  Registration Awaiting Setup
                </p>
                <p className="mt-1 text-[11px] text-natural-text-secondary">
                  The host has not published the active Google Form link for this event yet.
                </p>
              </div>
            )}

            {/* Meet Link integration if enabled */}
            {formSchema.meetLink && (
              <div className="rounded-2xl border border-blue-100 bg-blue-55/15 p-4 text-center">
                <div className="flex items-center justify-center gap-1 text-xs font-bold text-blue-700 mb-1">
                  <Video className="h-4 w-4" />
                  Google Meet Virtual Space
                </div>
                <p className="text-[10px] text-blue-600 font-medium mb-3">
                  This task contains an active meeting room for scheduled members.
                </p>
                <a
                  href={formSchema.meetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                >
                  Join Meeting Space
                </a>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
