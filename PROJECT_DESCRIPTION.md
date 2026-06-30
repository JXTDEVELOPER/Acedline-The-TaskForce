# Taskspace: Your AI-Powered Chief of Staff

## 💡 Inspiration

Traditional to-do lists and calendars are fundamentally passive. They act as digital filing cabinets—you write down a task, and the app simply waits for you to check it off. When deadlines approach, they just ping you with a notification, leaving you to figure out how to actually do the work. This leads to procrastination, overwhelming cognitive load, and missed deadlines.

We asked ourselves: What if a productivity app wasn't just a ledger, but an active participant? What if we could build an autonomous personal Chief of Staff that doesn't just remind you about your work, but actually helps you execute it?

## ⚙️ What it does

Taskspace is an advanced, AI-powered productivity suite deeply integrated with Google Workspace. It actively monitors your schedule, prioritizes your workload, and acts as an agentic assistant to generate the artifacts you need to get the job done.

**Core Capabilities:**

- **Frictionless Capture & Sync**: Add tasks via text or voice dictation. Taskspace instantly synchronizes your new task with Google Calendar and Google Tasks, and can even generate a Google Meet room automatically.
- **Smart Caching Layer**: To prevent API quota exhaustion, we've built a smart caching layer for external API calls, reducing unnecessary network requests while keeping data fresh.
- **AI Triage & Emergency Alerts**: As deadlines approach, Gemini automatically scales task priority to "High." Critical tasks trigger an instant, automated WhatsApp alert (via Twilio) to your phone.
- **The AI Productivity Coach**: Overwhelmed? Chat with the built-in Gemini coach. It breaks down massive projects into step-by-step, actionable action plans.
- **Agentic Execution (One-Click Workspace Generation)**: This is where Taskspace shines. It doesn't just give you advice; it executes. With one click, Taskspace can turn your AI action plan into tangible files:
  - 📄 Generate a structured Google Doc action plan.
  - 📊 Initialize a project tracking Google Sheet.
  - 🖼️ Create a Google Slides presentation outline.
  - 📝 Draft a contextual email directly into your Gmail Drafts.
  - 📝 Spin up a custom Google Form for event registrations.
- **Unified Dashboards**: Whether you prefer Kanban boards, visual Calendar grids, or importing active coursework straight from Google Classroom, Taskspace unifies your life into one beautiful, glassmorphism interface.

## 🛠️ How we built it

We built Taskspace using a modern, serverless monorepo architecture designed for speed and real-time synchronization.

- **The Brain (AI)**: We utilized Google AI Studio to configure the core decision engine. We leveraged gemini-2.5-flash for rapid parsing/triage and gemini-3.1-pro-preview in our "High Thinking" mode for complex task breakdowns. We utilized Strict JSON Structured Outputs to ensure the AI's decisions easily mapped to our frontend UI.
- **The UI (Frontend)**: A responsive, dark-mode-first dashboard built with React, Vite, TypeScript, and Tailwind CSS. We utilized Framer Motion for fluid animations and integrated a custom WebGL "liquid aurora" shader for a premium aesthetic.
- **The Engine (Backend & APIs)**: A Node.js/Express server handles the heavy lifting, orchestrating calls across a massive suite of Google Workspace REST APIs (Calendar, Tasks, Drive, Docs, Slides, Sheets, Forms, Classroom, Keep, Meet, and Gmail).
- **Data & Identity**: We used Firebase Authentication for secure Google Sign-In (automatically requesting the necessary OAuth scopes). Task state is persisted in Cloud Firestore, utilizing onSnapshot listeners to ensure the React UI updates in real-time across all devices without needing to refresh.

## 🚧 Challenges we ran into

- **Google OAuth Scope Management**: Orchestrating access to 10+ different Google Workspace APIs required careful management of OAuth scopes and access tokens via Firebase Authentication. Ensuring these tokens were securely passed to our Node backend to execute actions on behalf of the user was a major hurdle.
- **Controlling the LLM**: Forcing an AI to act as a strict decision engine (rather than a conversational chatbot) required intense prompt engineering. We heavily utilized AI Studio's JSON schema enforcement to ensure the AI returned predictable objects (like `{ "priority": "high", "description": "..." }`) that wouldn't crash our app.
- **Real-time State Syncing**: Keeping the visual Kanban board, the Calendar view, and the underlying Google Calendar synced perfectly required setting up robust Firestore listeners and implementing optimistic UI updates. Attempting direct database syncing initially resulted in conflict errors and was rolled back in favor of a more stable state-driven approach.
- **Offline Data Limitations**: We attempted to implement an offline mode using browser local storage, but quickly ran into data size limits when trying to store serialized workspace assets and cache responses. This failure pivoted our focus towards a more robust IndexedDB solution for the future.
- **Rapid API Credit Consumption**: During development and early testing, our intensive use of LLM evaluations and frequent Google Workspace API calls led to rapidly burning through our API credits. We had to find a way around this by implementing aggressive caching, debouncing rapid state changes, switching to the lighter `gemini-2.5-flash` model for routine tasks, and reserving the heavier `gemini-3.1-pro-preview` exclusively for "High Thinking" tasks, significantly reducing our overall API footprint and costs.

## 🏆 Accomplishments that we're proud of

- **True Agentic Behavior**: We successfully moved beyond a "wrapper" app. Taskspace actually does the work by physically writing files to a user's Google Drive based on Gemini's logical reasoning.
- **The Cyberpunk UI/UX**: Achieving a deeply immersive, highly animated interface (complete with cursor-tracking gradients, typewriter effects, and glitch text) without sacrificing React performance.
- **Flawless Integration**: Achieving bi-directional syncing so that a task checked off in Taskspace instantly checks off in the official Google Tasks app.

## 📖 What we learned

We learned the incredible power of combining LLMs with traditional API routing. An LLM on its own is just a text generator, but when you give it the "keys" to Google Workspace APIs, it becomes a literal agent capable of saving users hours of administrative busywork. We also deepened our understanding of Firebase's real-time capabilities and complex state management in React.

## 🚀 What's next for Taskspace

- **Team Collaboration**: Upgrading the data model to allow users to delegate tasks to team members, automatically managing Google Drive document sharing permissions.
- **Automated Email Scheduling**: Extending the AI Email Drafter to automatically read task context and schedule emails to send autonomously via Gmail at specific times.
- **AI Task Sub-division**: Automatically breaking down massive goals into nested sub-task trees using Gemini, allowing users to track micro-progress.
- **Offline PWA Support**: Implementing IndexedDB caching and service workers so users can manage their schedule without an internet connection, syncing changes the moment they reconnect.
