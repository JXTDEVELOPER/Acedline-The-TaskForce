import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy initialize Gemini Client
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please set it in AI Studio settings.");
    }
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

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

function getFriendlyErrorMessage(error: any): string {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();
  
  if (
    lowerMessage.includes("prepayment") ||
    lowerMessage.includes("credits are depleted") ||
    lowerMessage.includes("billing") ||
    lowerMessage.includes("resource_exhausted") ||
    lowerMessage.includes("quota exceeded") ||
    lowerMessage.includes("429") ||
    (error?.status === 429) ||
    (error?.code === 429)
  ) {
    return "Your Google AI Studio billing or prepayment credits are depleted. Please check your project and billing settings at https://ai.studio/projects. In the meantime, you can continue using the application manually without AI features.";
  }
  
  if (
    lowerMessage.includes("api key not valid") ||
    lowerMessage.includes("api_key_invalid") ||
    lowerMessage.includes("api key")
  ) {
    return "Gemini API key is invalid or missing. Please configure a valid API key in your AI Studio settings.";
  }
  
  return errorMessage;
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
      getAiClient().models.generateContent({
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
              priority: {
                type: Type.STRING,
                enum: ["high", "medium", "low"],
                description: "Priority of the task evaluated based on the time left to complete it relative to today's date. If < 24 hours, 'high'. If 1-3 days, 'medium'. If > 3 days, 'low'. Default to 'low' if no date is specified.",
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
      error: getFriendlyErrorMessage(error),
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
      getAiClient().models.generateContent({
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
      error: getFriendlyErrorMessage(error),
    });
  }
});

const systemInstruction = `Primary mission is to prevent users from missing important deadlines, commitments, assignments, meetings, projects, exams, and personal goals.

You are NOT a reminder application.

You do NOT simply notify users about tasks.

Instead, you actively help users plan, prioritize, execute, and complete work before deadlines are missed.

Core Responsibilities:

Task Understanding
Understand tasks expressed in natural language.
Extract deadlines, priorities, dependencies, and effort estimates.
Clarify ambiguity when necessary.
Intelligent Prioritization
Identify the most important tasks.
Consider urgency, impact, effort, and deadlines.
Recommend the highest-value actions.
Planning
Break large tasks into smaller actionable steps.
Generate realistic schedules.
Balance workload across available time.
Risk Detection
Identify tasks that are likely to be missed.
Calculate and explain deadline risks.
Warn users before problems become critical.
Proactive Intervention
When risk is detected, recommend corrective actions.
Create recovery plans.
Suggest schedule adjustments.
Productivity Coaching
Detect procrastination patterns.
Encourage execution through practical guidance.
Focus on action rather than motivation.
Reflection and Improvement
Analyze completed and missed tasks.
Provide insights and recommendations.
Help users continuously improve productivity.

Behavior Rules:

Be concise and actionable.
Always explain reasoning.
Prioritize execution over discussion.
Recommend specific next actions.
Prefer practical solutions over theoretical advice.
Be proactive rather than reactive.
Think like a chief of staff, not a chatbot.

When users ask:
"What should I do now?"

Analyze:
Upcoming deadlines
Priority levels
Risk scores
Existing commitments

Then provide:
Most important task
Reason
Estimated effort
Immediate next step

Output Style:
Clear
Structured
Practical
Professional

Never simply remind users about a task.
Always help them complete it.`;

app.post("/api/productivity-coach", async (req, res) => {
  try {
    const { messages, deepThinking } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages array" });
    }

    const formattedMessages = messages.map((m: any) => ({
      role: m.role === "model" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const modelName = deepThinking ? "gemini-3.1-pro-preview" : "gemini-3.5-flash";
    const config: any = {
      systemInstruction: {
        role: "system",
        parts: [{ text: systemInstruction }],
      },
      temperature: 0.7,
    };

    if (deepThinking) {
      config.thinkingConfig = {
        thinkingLevel: "HIGH"
      };
    }

    const response = await callGeminiWithRetry(() =>
      getAiClient().models.generateContent({
        model: modelName,
        contents: formattedMessages,
        config: deepThinking ? { ...config, thinkingConfig: { thinkingLevel: "HIGH" } } : config,
      })
    );

    return res.json({ reply: response.text });
  } catch (error: any) {
    console.error("Productivity coach error:", error);
    return res.status(500).json({
      error: getFriendlyErrorMessage(error),
    });
  }
});

app.post("/api/generate-email", async (req, res) => {
  try {
    const { topic } = req.body;
    if (!topic) {
      return res.status(400).json({ error: "Topic is required" });
    }

    const response = await callGeminiWithRetry(() =>
      getAiClient().models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            role: "user",
            parts: [{ text: `Draft a professional email about: ${topic}. Do not include a subject line or recipient placeholder, just provide the body text directly so it can be pasted into an email.` }]
          }
        ],
        config: {
          temperature: 0.7,
        }
      })
    );

    return res.json({ text: response.text });
  } catch (error: any) {
    console.error("Generate email error:", error);
    return res.status(500).json({
      error: getFriendlyErrorMessage(error),
    });
  }
});

app.post("/api/generate-action-plan", async (req, res) => {
  try {
    const { taskTitle, taskDescription } = req.body;
    if (!taskTitle) {
      return res.status(400).json({ error: "Task title is required" });
    }

    const ai = getAiClient();
    const systemInstruction = `You are a productivity expert. The user wants instructions on how to complete a task.
First, check if the task is realistic and possible to complete.
If it is impossible or highly unrealistic, politely explain why and suggest a better alternative.
If it is possible, provide a clear, step-by-step action plan to complete the task. Be concise and practical.`;

    const prompt = `Task: ${taskTitle}\nDetails: ${taskDescription || "None"}\nProvide an action plan.`;

    const response = await callGeminiWithRetry(() =>
      ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: {
            role: "system",
            parts: [{ text: systemInstruction }],
          },
          temperature: 0.5,
        },
      })
    );

    return res.json({ instructions: response.text });
  } catch (error: any) {
    console.error("Action plan generation error:", error);
    return res.status(500).json({ error: getFriendlyErrorMessage(error) });
  }
});

// API endpoint to parse dictated task to fill title and due date
app.post("/api/parse-dictation", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const todayDateStr = new Date().toISOString().split("T")[0];
    const systemInstruction = `You are a helpful assistant. The user has dictated a task.
Extract the task title and the due date/time if mentioned.
Current date reference: ${todayDateStr}

Output ONLY a JSON object with:
- "title": A concise string for the task title.
- "dueDate": "YYYY-MM-DD" if a date is mentioned, otherwise null.
- "dueTime": "HH:MM" (24-hour format) if a specific time is mentioned, otherwise null.`;

    const response = await callGeminiWithRetry(() =>
      getAiClient().models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: `Dictated text: "${text}"`,
        config: {
          systemInstruction: {
            role: "system",
            parts: [{ text: systemInstruction }],
          },
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              dueDate: { type: Type.STRING, nullable: true },
              dueTime: { type: Type.STRING, nullable: true },
            },
            required: ["title"],
          }
        },
      })
    );

    const textResponse = response.text || "{}";
    const data = JSON.parse(textResponse.trim());
    return res.json(data);
  } catch (error: any) {
    console.error("Parse dictation error:", error);
    return res.status(500).json({ error: getFriendlyErrorMessage(error) });
  }
});

app.post("/api/smart-task-autofill", async (req, res) => {
  try {
    const { title, dueDate } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Task title is required" });
    }

    const ai = getAiClient();
    const todayDateStr = new Date().toISOString().split("T")[0];
    const systemInstruction = `You are a helpful assistant. The user has provided a task title and an optional due date.
You must output ONLY a JSON object with two fields:
- "description": A concise, practical 2-3 sentence description of the sub-steps or context needed to complete this task.
- "priority": One of "high", "medium", or "low". Evaluate this according to the time left to complete the event relative to today's date (${todayDateStr}). If less than 24 hours left (or overdue), use "high". If 1-3 days left, use "medium". If more than 3 days left, use "low". If no due date is provided, infer the priority based on how typically urgent this kind of task is.

Do not output any markdown formatting (like \`\`\`json), just the raw JSON object.`;

    const prompt = `Task Title: ${title}\nDue Date: ${dueDate || "None"}`;

    const response = await callGeminiWithRetry(() =>
      ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: {
          systemInstruction: {
            role: "system",
            parts: [{ text: systemInstruction }],
          },
          temperature: 0.3,
          responseMimeType: "application/json",
        },
      })
    );

    const jsonText = response.text || "{}";
    let data;
    try {
      data = JSON.parse(jsonText);
    } catch (e) {
      // fallback in case model included markdown
      const cleaned = jsonText.replace(/```json/g, "").replace(/```/g, "").trim();
      data = JSON.parse(cleaned);
    }

    return res.json(data);
  } catch (error: any) {
    console.error("Smart autofill error:", error);
    return res.status(500).json({ error: getFriendlyErrorMessage(error) });
  }
});

app.post("/api/generate-daily-brief", async (req, res) => {
  try {
    const { analysis } = req.body;
    if (!analysis) {
      return res.status(400).json({ error: "Analysis data is required" });
    }

    const ai = getAiClient();
    const systemInstruction = `You are a helpful, professional, and motivating AI assistant that acts as a Chief of Staff.
You are given a structured JSON object representing the user's daily schedule analysis, including productivity metrics, calendar health, tasks, issues, and recommendations.

Your job is to read this data and produce a JSON response with the following string fields:
1. "brief": A short, clear Daily Brief text summarizing their workload, meetings, and free time for today.
2. "coaching": Friendly coaching and practical advice based on any issues or conflicts found, or just general productivity tips if none.
3. "motivation": A motivating statement to get them ready for the day.
4. "explanation": A human-readable explanation of their current productivity score and calendar health.

Keep all responses concise, encouraging, and highly readable.`;

    const prompt = `Here is the structured analysis data:
${JSON.stringify(analysis, null, 2)}`;

    const response = await callGeminiWithRetry(() =>
      ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: {
            role: "system",
            parts: [{ text: systemInstruction }],
          },
          temperature: 0.7,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              brief: { type: Type.STRING },
              coaching: { type: Type.STRING },
              motivation: { type: Type.STRING },
              explanation: { type: Type.STRING },
            },
            required: ["brief", "coaching", "motivation", "explanation"],
          }
        },
      })
    );

    const jsonText = response.text || "{}";
    let data;
    try {
      data = JSON.parse(jsonText);
    } catch (e) {
      const cleaned = jsonText.replace(/```json/g, "").replace(/```/g, "").trim();
      data = JSON.parse(cleaned);
    }

    return res.json(data);
  } catch (error: any) {
    console.error("Daily brief generation error:", error);
    return res.status(500).json({ error: getFriendlyErrorMessage(error) });
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
