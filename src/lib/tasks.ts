import { Task } from "../types";

/**
 * Formats a given date string to RFC 3339 timestamp as expected by Google Tasks API.
 * Google Tasks expects RFC 3339 timestamp (e.g., "2026-06-03T00:00:00.000Z").
 */
function formatTaskDueDate(dueDate?: string): string | undefined {
  if (!dueDate) return undefined;
  try {
    const d = new Date(dueDate);
    if (isNaN(d.getTime())) return undefined;
    return d.toISOString();
  } catch {
    return undefined;
  }
}

/**
 * Creates a Google Task on the default list.
 * Returns the created Google Task's ID.
 */
export async function createGoogleTask(task: Task, accessToken: string): Promise<string> {
  const url = "https://tasks.googleapis.com/tasks/v1/lists/@default/tasks";
  const body: any = {
    title: task.title,
    notes: task.description || "",
    status: task.completed ? "completed" : "needsAction",
  };

  const due = formatTaskDueDate(task.dueDate);
  if (due) {
    body.due = due;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Google Tasks Create Error:", errText);
    throw new Error(`Failed to create Google Task: ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.id) {
    throw new Error("No task ID returned from Google Tasks API");
  }

  return data.id;
}

/**
 * Updates an existing Google Task (title, notes/description, due date, status).
 */
export async function updateGoogleTask(task: Task, accessToken: string): Promise<void> {
  if (!task.googleTaskId) {
    throw new Error("No Google Task ID provided for update");
  }

  const url = `https://tasks.googleapis.com/tasks/v1/lists/@default/tasks/${task.googleTaskId}`;
  const body: any = {
    id: task.googleTaskId,
    title: task.title,
    notes: task.description || "",
    status: task.completed ? "completed" : "needsAction",
  };

  const due = formatTaskDueDate(task.dueDate);
  if (due) {
    body.due = due;
  } else {
    // Note: To clear due date in Google Tasks, sending null or omitting is standard.
    body.due = null;
  }

  // Google Tasks patch/update needs PUT request with the full resource representation
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Google Tasks Update Error:", errText);
    throw new Error(`Failed to update Google Task: ${response.statusText}`);
  }
}

/**
 * Lists Google Tasks from the default list.
 */
import { getCached, setCached } from "./cache";

export async function listGoogleTasks(accessToken: string, forceRefresh: boolean = false): Promise<any[]> {
  const url = "https://tasks.googleapis.com/tasks/v1/lists/@default/tasks?showCompleted=true&showHidden=true&maxResults=100";
  const cacheKey = `google-tasks-default`;
  
  if (!forceRefresh) {
    const cached = getCached<any[]>(cacheKey);
    if (cached) return cached;
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Google Tasks List Error:", errText);
    throw new Error(`Failed to list Google Tasks: ${response.statusText}`);
  }

  const data = await response.json();
  const items = data.items || [];
  setCached(cacheKey, items);
  return items;
}
export async function deleteGoogleTask(googleTaskId: string, accessToken: string): Promise<void> {
  const url = `https://tasks.googleapis.com/tasks/v1/lists/@default/tasks/${googleTaskId}`;
  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Google Tasks Delete Error:", errText);
    throw new Error(`Failed to delete Google Task: ${response.statusText}`);
  }
}
