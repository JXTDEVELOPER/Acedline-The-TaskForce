import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Helper function to call Gemini API with exponential backoff on 429 Rate Limits
async function callGeminiWithRetry<T>(
  apiCall: () => Promise<T>,
  maxRetries = 4,
  initialDelayMs = 1500
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await apiCall();
    } catch (error: any) {
      attempt++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isRateLimit = 
        errorMessage.includes("429") || 
        errorMessage.toLowerCase().includes("quota") || 
        errorMessage.toUpperCase().includes("RESOURCE_EXHAUSTED") ||
        (error?.status && error.status === 429) ||
        (error?.code && error.code === 429);

      if (isRateLimit && attempt < maxRetries) {
        // Calculate exponential backoff delay with random jitter
        const delay = initialDelayMs * Math.pow(2.2, attempt - 1) + Math.random() * 500;
        console.warn(`[Gemini API] Request rate limited (Attempt ${attempt}/${maxRetries}). Retrying in ${Math.round(delay)}ms... Error context: ${errorMessage}`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}

// API endpoint to parse natural language scheduling and registration prompts using Gemini
app.post("/api/parse-event-prompt", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const todayDateStr = new Date().toISOString().split("T")[0];
    const systemInstruction = `You are an expert event manager, administrative assistant, and scheduling scheduler. 
Given a natural language scheduling prompt, analyze the instructions and extract structured event attributes.
1. Create a clear, concise and professional "title" for the calendar event or task.
2. Formulate a useful and details-rich text "description".
3. Detect if a due date or specific meeting date/time is mentioned. Reference it relative to today's date: ${todayDateStr}. Format as "YYYY-MM-DD" if it is only a general day, or "YYYY-MM-DDTHH:MM" if there is a specific hour/minute. If no date is mentioned, return null or empty.
4. Set "addMeet" as true if a Google Meet, video conference, call, virtual link, or online session is requested or implied, otherwise false.
5. Set "addGoogleTask" as true if reminders, to-dos, or adding to checklist or Google Task is requested or implied, otherwise false.
6. Detect if the user wants to gather registration information, register attendees, or design client/guest forms (e.g. collecting names, emails, dietary options, or RSVP selections). If they do, compose a highly structured array inside "registrationFields". If not specified or implied, "registrationFields" should be an empty list.
7. Always supply standard default registration questions (Full Name and Email Address) inside "registrationFields" if the prompt has requested registration of participants.`;

    const response = await callGeminiWithRetry(() =>
      ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `User scheduling prompt: "${prompt}"`,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: "Concise calendar event or task title",
              },
              description: {
                type: Type.STRING,
                description: "Thorough description, itinerary, or summary notes",
              },
              dueDate: {
                type: Type.STRING,
                description: "ISO formatted date (YYYY-MM-DD or YYYY-MM-DDTHH:MM) if scheduled/mentioned. Or leave empty.",
              },
              addMeet: {
                type: Type.BOOLEAN,
                description: "Whether a video call or Google Meet is mentioned/needed.",
              },
              addGoogleTask: {
                type: Type.BOOLEAN,
                description: "Whether a synchronized todo item or Google Task is mentioned/needed.",
              },
              registrationFields: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: {
                      type: Type.STRING,
                      description: "Unique snake_case input identifier (e.g., dietary_needs)",
                    },
                    label: {
                      type: Type.STRING,
                      description: "Human-readable label (e.g., Dietary Restrictions)",
                    },
                    type: {
                      type: Type.STRING,
                      description: "Type of input: 'text', 'email', 'checkbox', or 'select'",
                    },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "List of choices if type is 'select'; empty array otherwise",
                    },
                    required: {
                      type: Type.BOOLEAN,
                      description: "Whether this input is required",
                    },
                    placeholder: {
                      type: Type.STRING,
                      description: "Helpful placeholder text for the input",
                    },
                  },
                  required: ["id", "label", "type", "required"],
                },
                description: "List of registration form inputs to generate if signing up people is requested, otherwise empty list.",
              },
            },
            required: ["title", "description", "addMeet", "addGoogleTask"],
          },
        },
      })
    );

    const textResponse = response.text;
    if (!textResponse) {
      throw new Error("No response returned from the scheduling model.");
    }

    const data = JSON.parse(textResponse.trim());
    return res.json(data);
  } catch (error: any) {
    console.error("AI scheduling parser error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// API endpoint to generate dynamic form using Gemini API
app.post("/api/generate-form", async (req, res) => {
  try {
    const { prompt, title } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const systemInstruction = `You are an expert user interface and form design specialist. Given description or list of desired items for a registration event, generate a highly structured list of form fields.
Analyze the user's criteria to detect whether a text input, email format, checkbox (binary true/false), or multi-choice select list is needed. Specify required inputs, clean placeholders, and options.

Make sure to always have safe default registration questions, like Full Name and Email Address, even if they aren't explicitly requested, since this is for meeting registration. For checkboxes or yes/no inputs, always keep type as 'checkbox'. For multi-choice lists, set type strictly as 'select' and define options containing individual readable string selections. For text inputs, set type as 'text' or 'email'.`;

    const userPrompt = `Event Title: "${title || "Event Registration"}"\nDesired info / user constraints: "${prompt}"`;

    const response = await callGeminiWithRetry(() =>
      ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              fields: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: {
                      type: Type.STRING,
                      description: "Unique snake_case target id (e.g., registrant_name)",
                    },
                    label: {
                      type: Type.STRING,
                      description: "Display label for users (e.g., Full Name)",
                    },
                    type: {
                      type: Type.STRING,
                      description: "Field input style: 'text', 'email', 'checkbox', or 'select'",
                    },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "List of item strings if type is 'select'; leave empty otherwise",
                    },
                    required: {
                      type: Type.BOOLEAN,
                      description: "Whether this form field is required",
                    },
                    placeholder: {
                      type: Type.STRING,
                      description: "Friendly placeholder text for inputs",
                    },
                  },
                  required: ["id", "label", "type", "required"],
                },
              },
            },
            required: ["fields"],
          },
        },
      })
    );

    const textResponse = response.text;
    if (!textResponse) {
      throw new Error("Empty response from AI generation model.");
    }

    const data = JSON.parse(textResponse.trim());
    return res.json(data);
  } catch (error: any) {
    console.error("AI dynamic form generation error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// API routes FIRST
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Vite middleware for development
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

setupVite();
