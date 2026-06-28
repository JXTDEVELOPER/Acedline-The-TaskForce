import { Task } from "../types";

export async function createGoogleDocWithInstructions(taskTitle: string, instructions: string, token: string): Promise<string> {
  // 1. Create a blank document
  const createRes = await fetch("https://docs.googleapis.com/v1/documents", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: `Action Plan: ${taskTitle}`,
    }),
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    console.error("Docs creation error:", errorText);
    throw new Error("Failed to create Google Doc.");
  }

  const docData = await createRes.json();
  const documentId = docData.documentId;

  // 2. Insert text into the document
  const updateRes = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            location: {
              index: 1,
            },
            text: instructions,
          }
        }
      ]
    }),
  });

  if (!updateRes.ok) {
    console.error("Docs update error:", await updateRes.text());
    throw new Error("Failed to write instructions to the document.");
  }

  return `https://docs.google.com/document/d/${documentId}/edit`;
}

export async function createGoogleSlidesPresentation(taskTitle: string, instructions: string, token: string): Promise<string> {
  // 1. Create a blank presentation
  const createRes = await fetch("https://slides.googleapis.com/v1/presentations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: `Plan: ${taskTitle}`,
    }),
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    console.error("Slides creation error:", errorText);
    throw new Error("Failed to create Google Slides presentation.");
  }

  const slideData = await createRes.json();
  const presentationId = slideData.presentationId;
  const slideId = slideData.slides[0].objectId;

  // 2. Insert text into the presentation (update title slide)
  const updateRes = await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            objectId: slideData.slides[0].pageElements[0].objectId,
            text: taskTitle,
          }
        },
        {
          insertText: {
            objectId: slideData.slides[0].pageElements[1].objectId,
            text: instructions,
          }
        }
      ]
    }),
  });

  if (!updateRes.ok) {
    console.error("Slides update error:", await updateRes.text());
    // Continue even if update fails, we still have the presentation
  }

  return `https://docs.google.com/presentation/d/${presentationId}/edit`;
}

export async function draftEmailWithInstructions(taskTitle: string, instructions: string, token: string, recipient?: string): Promise<void> {
  const subject = `Action Plan for: ${taskTitle}`;
  const body = instructions;
  
  // Construct RFC 2822 message
  const rawMessageLines = [
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=utf-8",
  ];
  
  if (recipient) {
    rawMessageLines.unshift(`To: ${recipient}`);
  }
  
  const rawMessage = [...rawMessageLines, "", body].join("\n");

  const encodedMessage = btoa(unescape(encodeURIComponent(rawMessage)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        raw: encodedMessage
      }
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Gmail draft error:", errorText);
    throw new Error("Failed to create Gmail draft.");
  }
}

export async function createGoogleSheetForTask(taskTitle: string, token: string): Promise<string> {
  const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: { title: `Task Tracking: ${taskTitle}` }
    }),
  });

  if (!createRes.ok) {
    console.error("Sheets creation error:", await createRes.text());
    throw new Error("Failed to create Google Sheet.");
  }

  const data = await createRes.json();
  return data.spreadsheetUrl;
}

export async function createGoogleKeepNote(taskTitle: string, instructions: string, token: string): Promise<string> {
  const res = await fetch("https://keep.googleapis.com/v1/notes", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: `Action Plan: ${taskTitle}`,
      body: { text: { text: instructions } }
    }),
  });

  if (!res.ok) {
    console.warn("Keep Note creation failed or not supported in this environment:", await res.text());
    return "https://keep.google.com/";
  }

  return "https://keep.google.com/";
}

export async function createGoogleForm(taskTitle: string, token: string): Promise<string> {
  const createRes = await fetch("https://forms.googleapis.com/v1/forms", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      info: { title: `Feedback Form: ${taskTitle}` }
    }),
  });

  if (!createRes.ok) {
    throw new Error("Failed to create Google Form.");
  }

  const data = await createRes.json();
  return `https://docs.google.com/forms/d/${data.formId}/edit`;
}

export async function createGoogleClassroom(taskTitle: string, token: string): Promise<string> {
  const res = await fetch("https://classroom.googleapis.com/v1/courses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: `Project: ${taskTitle}`,
      section: "Tasks",
      ownerId: "me",
      courseState: "PROVISIONED"
    }),
  });

  if (!res.ok) {
    console.warn("Classroom creation failed", await res.text());
    return "https://classroom.google.com/";
  }

  const data = await res.json();
  return data.alternateLink;
}

export async function listGoogleClassrooms(token: string): Promise<any[]> {
  const res = await fetch("https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE", {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
    }
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Failed to list classrooms:", errorText);
    return [];
  }

  const data = await res.json();
  return data.courses || [];
}

export async function listClassroomCourseWork(courseId: string, token: string): Promise<any[]> {
  const res = await fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/courseWork`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
    }
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`Failed to list courseWork for course ${courseId}:`, errorText);
    return [];
  }

  const data = await res.json();
  return data.courseWork || [];
}
