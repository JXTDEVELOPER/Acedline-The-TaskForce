import { Task } from "../types";

/**
 * Calculates start and end formats for Google Calendar events.
 * Handles both classic all-day dates (YYYY-MM-DD) and specific date-times.
 */
function getEventTiming(dueDate: string): {
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
} {
  const isDateTime = dueDate.includes("T");
  const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (isDateTime) {
    const startDate = new Date(dueDate);
    const endDate = new Date(startDate.getTime() + 30 * 60 * 1000); // 30 minutes later

    return {
      start: {
        dateTime: startDate.toISOString(),
      },
      end: {
        dateTime: endDate.toISOString(),
      },
    };
  } else {
    // All-day event. Google requires 'end.date' to be the next day (exclusive).
    const startPart = dueDate; // YYYY-MM-DD
    const dateObj = new Date(dueDate + "T00:00:00");
    dateObj.setDate(dateObj.getDate() + 1);
    
    // Format YYYY-MM-DD safely
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    const endPart = `${year}-${month}-${day}`;

    return {
      start: { date: startPart },
      end: { date: endPart },
    };
  }
}

/**
 * Creates an event on the user's primary Google Calendar.
 */
export async function createCalendarEvent(
  task: Task,
  accessToken: string
): Promise<string> {
  if (!task.dueDate) {
    throw new Error("Cannot create a calendar event without a due date");
  }

  const timing = getEventTiming(task.dueDate);
  const summaryPrefix = task.completed ? "✓ " : "";
  const baseDescription = task.description || "Created with Minimalist To-Do app.";
  const description = task.meetLink
    ? `${baseDescription}\n\nGoogle Meet Link: ${task.meetLink}`
    : baseDescription;

  const body = {
    summary: `${summaryPrefix}${task.title}`,
    description,
    ...timing,
  };

  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error("Google Calendar Create Event Error:", errText);
    throw new Error(`Failed to create calendar event: ${response.statusText}`);
  }

  const data = await response.json();
  return data.id;
}

/**
 * Lists upcoming and recent events from the user's primary Google Calendar.
 */
export async function listCalendarEvents(
  accessToken: string,
  timeMin?: string,
  maxResults: number = 50
): Promise<any[]> {
  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: String(maxResults),
  });

  if (timeMin) {
    params.append("timeMin", timeMin);
  } else {
    // Set default to beginning of today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    params.append("timeMin", today.toISOString());
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error("Google Calendar List Events Error:", errText);
    throw new Error(`Failed to list calendar events: ${response.statusText}`);
  }

  const data = await response.json();
  return data.items || [];
}

/**
 * Updates an existing calendar event.
 */
export async function updateCalendarEvent(
  task: Task,
  accessToken: string
): Promise<void> {
  if (!task.googleEventId || !task.dueDate) {
    return;
  }

  const timing = getEventTiming(task.dueDate);
  const summaryPrefix = task.completed ? "✓ " : "";
  const baseDescription = task.description || "Created with Minimalist To-Do app.";
  const description = task.meetLink
    ? `${baseDescription}\n\nGoogle Meet Link: ${task.meetLink}`
    : baseDescription;

  const body = {
    summary: `${summaryPrefix}${task.title}`,
    description,
    ...timing,
  };

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${task.googleEventId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error("Google Calendar Update Event Error:", errText);
    // Silent fail if event not found or deleted externally
  }
}

/**
 * Deletes a calendar event.
 */
export async function deleteCalendarEvent(
  eventId: string,
  accessToken: string
): Promise<void> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error("Google Calendar Delete Event Error:", errText);
    // Silent fail if event already deleted on Google Calendar web interface
  }
}
