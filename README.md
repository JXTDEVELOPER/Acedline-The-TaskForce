# 🚀 TaskSpace – AI-Powered Google Workspace Productivity Companion

> **TaskSpace** transforms Google Workspace into an intelligent productivity companion that helps users plan, prioritize, and complete work before deadlines are missed.

![Hackathon](https://img.shields.io/badge/Vibe2Ship-Problem%201-blue)
![React](https://img.shields.io/badge/React-19-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)
![Firebase](https://img.shields.io/badge/Firebase-Enabled-FFCA28)
![Google%20Cloud](https://img.shields.io/badge/Google%20Cloud-Deployed-4285F4)
![Gemini](https://img.shields.io/badge/Gemini-AI-8E75FF)

---

# 📖 Overview

TaskSpace is an AI-powered productivity platform built for the **Vibe2Ship Hackathon – Problem Statement 1: The Last-Minute Life Saver**.

Instead of acting as another reminder application, TaskSpace combines Google Workspace services with AI assistance to help users organize, schedule, collaborate, and execute work efficiently.

---

# ✨ Core Features

- Google Sign-In
- Smart Task Management
- Kanban Board
- Google Calendar Integration
- Google Tasks Synchronization
- Gmail Draft Generation
- Google Docs Generation
- Google Sheets Generation
- Google Slides Generation
- Google Forms Generation
- Google Classroom Integration
- Google Meet Integration
- Gemini AI Assistant
- Responsive Dashboard
- Settings & Preferences

---

# 🏗️ High Level Architecture

```mermaid
flowchart LR
    U[User]
    FE[React Frontend]
    BE[Node Backend]
    FA[Firebase Authentication]
    FS[Firestore]
    GM[Gemini AI]
    GC[Google Calendar]
    GT[Google Tasks]
    GD[Google Docs]
    GS[Google Sheets]
    GL[Google Slides]
    GF[Google Forms]
    GG[Gmail]
    GCL[Google Classroom]
    MEET[Google Meet]

    U --> FE
    FE --> FA
    FE --> FS
    FE --> BE

    BE --> GM
    BE --> GC
    BE --> GT
    BE --> GD
    BE --> GS
    BE --> GL
    BE --> GF
    BE --> GG
    BE --> GCL
    BE --> MEET
```

---

# 🔄 Application Flow

```mermaid
flowchart TD
    A[Login] --> B[Dashboard]
    B --> C[Create Task]
    C --> D[Save to Firestore]
    D --> E[Sync Calendar]
    D --> F[Sync Google Tasks]
    B --> G[Gemini Assistant]
    G --> H[Workspace Actions]
```

---

# 🤖 AI Workflow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Gemini

    User->>Frontend: Ask AI
    Frontend->>Backend: Send request
    Backend->>Gemini: Generate response
    Gemini-->>Backend: AI output
    Backend-->>Frontend: Structured response
    Frontend-->>User: Display result
```

---

# ☁️ Google Workspace Integration

```mermaid
flowchart TD
    T[Task] --> F[Firestore]
    F --> C[Google Calendar]
    F --> GT[Google Tasks]
    F --> D[Google Docs]
    F --> S[Google Sheets]
    F --> SL[Google Slides]
    F --> FM[Google Forms]
    F --> G[Gmail]
    F --> M[Google Meet]
```

---

# 🛠️ Technology Stack

| Layer | Technology |
|------|------------|
| Frontend | React, TypeScript, Vite |
| Backend | Node.js |
| Authentication | Firebase Authentication |
| Database | Firestore |
| AI | Gemini |
| Cloud | Google Cloud |
| Styling | Tailwind CSS |
| APIs | Google Workspace APIs |

---

# 📂 Project Structure

```text
src/
├── components/
├── hooks/
├── lib/
├── assets/
├── App.tsx
└── main.tsx

server.ts
```

---

# ⚙️ Installation

```bash
git clone https://github.com/joshuaxavierthomas/taskspace.git
cd taskspace
npm install
npm run dev
```

# 🔐 Environment Variables

```env
GEMINI_API_KEY=
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

---

# 🚀 Deployment

Deploy frontend and backend to Google Cloud.

Ensure Google APIs are enabled and environment variables are configured.

---

# 🛣️ Roadmap

- Deadline Risk Prediction
- Productivity Analytics
- Calendar Health
- WhatsApp Alerts
- Push Notifications
- Mobile App

---

# 📸 Application Screenshots

> **Note:** Place all screenshots inside `docs/images/` in your GitHub repository and update the image paths if necessary.

## 🔐 Login

![Login](docs/images/login.png)

---

## 🏠 Welcome Dashboard

![Welcome Dashboard](docs/images/welcome-dashboard.png)

---

## 🤖 AI Brief

![AI Brief](docs/images/ai-brief.png)

---

## 📅 Event Management

![Event Management](docs/images/event-management.png)

---

## ➕ Create Task / Meeting

![Create Task](docs/images/calendar-task-dialog.png)

---

## 🗓️ Calendar Dashboard

![Calendar Dashboard](docs/images/calendar-dashboard.png)

### Add Task Directly from Calendar

![Add Task](docs/images/calendar-task-dialog.png)

### Calendar Event Details

![Calendar Details](docs/images/calendar-event-details.png)

---

## 🎯 Self-Directed Activity

![Self Directed Activity](docs/images/self-directed-activity.png)

---

## 📋 Kanban Board

![Kanban](docs/images/kanban-board.png)

---

## 🎓 Google Classroom

![Google Classroom](docs/images/google-classroom.png)

---

## ⚙️ Settings

![Settings 1](docs/images/Settings-1.png)

![Settings 2](docs/images/Setting-2.png)

---

## 🧰 Developer Tools

### Version History

![Version History](docs/images/version-history.png)

### Debug Dashboard

![Debug Dashboard](docs/images/debug-dashboard.png)

---

## 📑 Sidebar Navigation

![Sidebar](docs/images/sidebar.png)

---

# 🚀 What's Next for TaskSpace

- **WhatsApp Integration:** One of our most exciting future plans is to bring TaskSpace directly into WhatsApp. Instead of requiring users to open the web application, they will be able to manage their productivity directly from a WhatsApp conversation.
- **Offline Mode & PWA Support:** Implementing IndexedDB caching and service workers so users can manage their schedules completely offline, with an offline sync queue that pushes changes to Google Workspace endpoints seamlessly the moment internet connection is restored.
- **Advanced AI Task Sub-division:** Upgrading the server-side Gemini prompts to automatically dissect large, complex goals into hierarchical, nested sub-task trees, displaying them in an indented accordion list view.
- **Team Collaboration & Delegation:** Modifying Firestore rules and schema definitions to support a `sharedWith` array, allowing users to safely delegate tasks to team members while automatically managing Google Drive document sharing permissions across separate workspaces.
- **Predictive Deadline Risk & Health Scoring:** Developing predictive analytics to compute a user's calendar health score based on task completion velocity and historical burn-down charts.

---

# 🧗 Challenges Faced

- **Google OAuth Scope Management:** Orchestrating access to over 10 different Google Workspace APIs required meticulous management of OAuth scopes and access tokens via Firebase Authentication to securely execute actions on behalf of the user.
- **Controlling the LLM Engine:** Forcing an AI to act as a strict decision engine rather than a conversational chatbot required intense prompt engineering and reliance on AI Studio's JSON schema enforcement to ensure predictable data objects that wouldn't crash the frontend application logic.
- **Rapid API Quota Exhaustion:** As we experimented with proactive agentic features, frequent model calls threatened to exhaust our available API credits. We redesigned our system architecture to handle scheduling and priority sorting via deterministic application logic locally, while reserving Gemini models strictly for tasks requiring natural language generation and reasoning. We also introduced aggressive caching layers to minimize repeated AI requests.
- **Real-time State Synchronization:** Keeping the visual Kanban board, the Calendar view, and underlying Google endpoints fully synchronized without hitting rate limits required building robust Cloud Firestore listeners and implementing optimistic UI updates. Initial direct database syncing attempts caused conflict errors and had to be refactored into a more stable state-driven approach.

---

# 👤 Author

**Joshua Xavier Thomas** ([joshuaxavierthomas@gmail.com](mailto:joshuaxavierthomas@gmail.com))
