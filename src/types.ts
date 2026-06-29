export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  dueDate?: string; // ISO String (e.g. 2026-06-03T15:30:00.000Z) or YYYY-MM-DD
  completed: boolean;
  priority?: "high" | "medium" | "low";
  stage?: string;
  estimatedDuration?: number; // In minutes
  completionPercentage?: number; // 0-100
  dependencies?: string[]; // Array of task IDs
  googleEventId?: string | null;
  meetLink?: string | null;
  googleTaskId?: string | null;
  workspaceType?: "personal" | "team";
  assigneeEmail?: string;
  sharedWith?: string[];
  createdAt: any; // Timestamp or Date
  updatedAt: any; // Timestamp or Date
}

export interface FormField {
  id: string;
  label: string;
  type: "text" | "email" | "checkbox" | "select";
  options?: string[];
  required: boolean;
  placeholder?: string;
}

export interface FormSchema {
  taskId: string;
  userId: string;
  title: string;
  description?: string;
  meetLink?: string | null;
  fields: FormField[];
  googleFormUrl?: string | null; // public link (responderUri)
  googleFormId?: string | null;   // edit id (formId)
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}
