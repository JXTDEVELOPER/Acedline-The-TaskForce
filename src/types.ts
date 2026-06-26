export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  dueDate?: string; // ISO String (e.g. 2026-06-03T15:30:00.000Z) or YYYY-MM-DD
  completed: boolean;
  priority?: "high" | "medium" | "low";
  googleEventId?: string | null;
  meetLink?: string | null;
  googleTaskId?: string | null;
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

export function getDynamicPriority(task: Pick<Task, 'dueDate' | 'priority'>): "high" | "medium" | "low" {
  if (task.dueDate) {
    const dueTime = new Date(task.dueDate).getTime();
    const nowTime = new Date().getTime();
    const hoursRemaining = (dueTime - nowTime) / (1000 * 60 * 60);
    
    if (hoursRemaining <= 24) return "high"; // Overdue or < 24h
    if (hoursRemaining <= 72) return "medium"; // 1-3 days
    return "low"; // > 3 days
  }
  return task.priority || "low";
}
export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}
