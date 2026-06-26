import { Task } from "../types";

/**
 * Creates a Google Meet meeting space using the user's Google OAuth access token.
 * Returns the meeting URI (e.g., https://meet.google.com/abc-defg-hij) or null if it fails.
 */
export async function createMeetSpace(accessToken: string): Promise<string> {
  const response = await fetch("https://meet.googleapis.com/v2/spaces", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Google Meet Create Space Error:", errText);
    throw new Error(`Failed to create Google Meet space: ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.meetingUri) {
    throw new Error("No meeting URL returned from Google Meet API");
  }

  return data.meetingUri;
}
