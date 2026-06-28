# Google Workspace-Integrated Task Manager

A highly polished, modern single-page task management application built with **React**, **Vite**, **TypeScript**, and **Tailwind CSS**. It is fully integrated with **Firebase** (Authentication & Firestore) and a comprehensive suite of **Google Workspace APIs** (Calendar, Meet, Tasks, Docs, Slides, Sheets, Keep, Classroom, Forms, and Gmail) to provide real-time synchronization of tasks, deadlines, and AI-powered productivity planning.

---

## Key Features

- **Secure Authentication**: Google Sign-In powered by **Firebase Authentication** with auto-requesting of Google API integration credentials.
- **Real-Time Synergy**: Auto-saves lists, tasks, and state transitions directly to **Cloud Firestore**.
- **Dynamic Task Prioritization**: Automatically calculates task priority (High, Medium, Low) based on the time remaining until the deadline.
- **AI Productivity Coach**: Powered by Gemini API to analyze tasks, prevent missed deadlines, and generate step-by-step action plans.
- **Google Workspace AI Generation**: One-click generation of AI action plans directly into your Google Workspace:
  - 📝 **Google Docs**: Create formatted action plan documents.
  - 📊 **Google Slides**: Generate presentation outlines for task execution.
  - 📈 **Google Sheets**: Initialize new project tracking spreadsheets.
  - 📧 **Gmail**: Draft email plans to share with teams and automatically create email drafts with AI.
  - 💡 **Google Keep**: Create quick reference notes for task steps.
  - 🎓 **Google Classroom**: Provision new Classroom courses for larger projects.
  - 📋 **Google Forms**: Create customizable dynamic sign-up questionnaires and feedback forms.
- **Google Calendar Sync**: Creating a task with a deadline automatically creates a corresponding Google Calendar event on your synced accounts.
- **Dedicated Calendar View**: Easily view, manage, and add tasks directly from an integrated calendar dashboard view. Includes a quick-access sidebar separating upcoming Team Events and Self-Directed Personal tasks.
- **Quick Actions**: Mark tasks as done directly from the Calendar and Self-Directed Activity Dashboards with one-click actions.
- **Google Classroom Integration**: Sync your active coursework seamlessly. The application imports active Google Classroom coursework and aligns it into your unified tasks list.
- **Google Meet Generation**: Create official virtual Google Meet video conference links directly from the task interface with one click.
- **Google Tasks Integration**: Synced tasks are bound directly to your Google Account’s default list, letting you toggle task completion statuses, modify descriptions, and delete events seamlessly between platforms.
- **Destructive Safety Guards**: Beautiful, soft custom modal Overlays guard destructive delete operations on synced Workspace elements to prevent accidental data loss.

---

## How It Works (User Flow)

The application unifies task management, AI productivity planning, and Google Workspace into a single, cohesive workflow:

1. **Authentication & Authorization**: When a user logs in, Firebase Authentication securely handles their Google identity, whilst silently requesting OAuth scopes. This immediately unlocks the ability to communicate directly with their calendar, tasks, drive, and other connected Google services.
2. **Task Creation & Syncing**: A user creates a task (e.g., "Prepare Q3 Marketing Presentation") and sets a deadline. The application instantly:
   - Saves the task persistently to **Cloud Firestore**.
   - Creates a **Google Calendar** event at the specified time.
   - Syncs the item to the user's default **Google Tasks** list.
   - (Optional) Generates a secure **Google Meet** virtual room link for collaboration.
3. **Dynamic Triage**: The system actively monitors due dates against the current time. As a task's deadline approaches (e.g., within 24 hours), the application automatically escalates its priority label to **High**, ensuring the most urgent work is always visible on the Self-Directed Activity Dashboard.
4. **AI Coach Analysis**: If a user is overwhelmed, they switch to the Productivity Coach interface. The Gemini 2.5 Flash model reads the active task payload and acts as an intelligent sounding board, generating step-by-step instructions or restructuring the work logically to prevent missed deadlines.
5. **Workspace Action Plan Generation**: With a single click from the dashboard, the user can turn the AI's step-by-step advice into tangible Google Workspace artifacts. The application securely contacts Google APIs to generate populated Google Docs, structured Google Slides, templated Google Sheets, email drafts in Gmail, Keep notes, or Classroom instances—saving hours of manual setup.

---

## Architectural Breakdown

1. **Frontend Core**: React 19 + TypeScript + Tailwind CSS configured with a tailored, modern color palette.
2. **Serverless Database**: Cloud Firestore handles sub-second document snapshot synchronization with verified database security rules (`firestore.rules`).
3. **Identity & Auth Provider**: Firebase Authentication prompts popup-based Google OAuth providers caching valid dynamic Access Tokens in-memory for downstream API integrations.
4. **Google API Layer**: Low-overhead native fetch queries proxying actions straight into the REST endpoints of `googleapis.com` for maximum reliability and minimum payload sizes.
5. **AI Integration**: Express backend server proxying secure requests to the Gemini API (`gemini-2.5-flash`) for intelligent action plan generation.

---

## Step-by-Step Setup Guide

This guide describes how to replicate the ecosystem locally or migrate it to your own Google Developer console and Firebase project.

### 📋 Prerequisites

Ensure you have the following installed on your developer machine:
- **Node.js** (v18.0.0 or higher)
- **npm** (v9.0.0 or higher)
- A **Google (Gmail/Workspace) Account** (to access Google Calendar, Meet, and Tasks panels)

---

### Step 1: Firebase Project Configuration

This application securely uses Firestore for task persistence and Firebase Auth for secure identity providers.

1. **Create a Firebase Project**:
   - Navigate to the [Firebase Console](https://console.firebase.google.com/).
   - Click **Add Project** and give it a name (e.g., `Task-Manager-Workspace`).
   - Enable or disable Google Analytics based on preference, then click **Create Project**.

2. **Add a Web App inside your Firebase Project**:
   - On the Project Overview home screen, click the **Web icon (`</>`)** to register a new application.
   - Name your Web App (e.g., `Workspace Task App`) and register it.
   - Copy the generated `firebaseConfig` credentials block.

3. **Configure the App Keys**:
   - Edit `/firebase-applet-config.json` in the project root folder.
   - Replace the values there with your new web app details.
   *(Note: If you are using a custom/named database, specify its name on the `firestoreDatabaseId` field, otherwise set it to `"(default)"`)*

4. **Enable Firebase Authentication**:
   - Under the **Build** panel in the Firebase sidebar, go to **Authentication** and click **Get Started**.
   - Browse to the **Sign-In Method** tab, select **Google**, enable it, choose a project support email, and click **Save**.

5. **Enable Cloud Firestore Database**:
   - Go to **Firestore Database** in the sidebar and click **Create Database**.
   - Set up your database location (e.g., `us-west1` or your nearest region).
   - Start in **Test Mode** or **Locked Mode**.
   - Set up security rules by uploading the rules found in our local `/firestore.rules` file to restrict update operations to authenticated creators.

---

### Step 2: Google Developer Console configuration (OAuth & APIs)

Since Firebase handles user sign-in via Google, a Google Developer Console project is automatically bound to your Firebase project.

1. **Open Google Cloud Developer Console**:
   - Navigate to the [Google Cloud Console](https://console.cloud.google.com/).
   - From the projects dropdown search and select your Firebase Project ID.

2. **Enable the Necessary APIs**:
   Search for and click **Enable** for the following APIs under the "APIs & Services" -> "Library" menu:
   - 📅 **Google Calendar API** 
   - 📞 **Google Meet API**
   - 📝 **Google Tasks API** 
   - 📄 **Google Forms API**
   - 📧 **Gmail API**
   - 📝 **Google Docs API**
   - 📊 **Google Slides API**
   - 📈 **Google Sheets API**
   - 💡 **Google Keep API**
   - 🎓 **Google Classroom API**
   - 📁 **Google Drive API**

3. **Configure OAuth Consent Screen & Scopes**:
   - Scroll to **APIs & Services** > **OAuth consent screen**.
   - Set user type to **External** and complete the mandatory form details.
   - On the **Scopes** step, click **Add or Remove Scopes**.
   - Paste or check the following OAuth scopes requested by this application:
     - `https://www.googleapis.com/auth/calendar`
     - `https://www.googleapis.com/auth/meetings.space.created`
     - `https://www.googleapis.com/auth/tasks`
     - `https://www.googleapis.com/auth/forms.body`
     - `https://www.googleapis.com/auth/gmail.compose`
     - `https://www.googleapis.com/auth/documents`
     - `https://www.googleapis.com/auth/presentations`
     - `https://www.googleapis.com/auth/spreadsheets`
     - `https://www.googleapis.com/auth/keep`
     - `https://www.googleapis.com/auth/classroom.courses`
     - `https://www.googleapis.com/auth/classroom.courses.readonly`
     - `https://www.googleapis.com/auth/classroom.coursework.me.readonly`
     - `https://www.googleapis.com/auth/drive`
   - Add your own Google Account as a **Test User** (highly critical if the application is still in "Testing" mode on the consent page). Save changes.

---

### Step 3: Run the Application Locally

1. **Install Dependencies**:
   Navigate to the project root directory in your terminal and run:
   ```bash
   npm install
   ```

2. **Configure Environmental Variables**:
   Copy `.env.example` to `.env` to declare secrets:
   ```bash
   cp .env.example .env
   ```
   Modify `.env` to add your `GEMINI_API_KEY` for the AI Productivity Coach features.

3. **Start Development Server**:
   Launch the high-performance Vite dev server on Port 3000:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your web browser.

4. **Verify Lints & Type Checking**:
   Ensure code standards remain pristine by compiling your typescript definitions and testing endpoints:
   ```bash
   npm run lint
   ```

5. **Build for Production**:
   Compile the single-page application into ultra-efficient static assets inside the `dist/` directory:
   ```bash
   npm run build
   ```

---

## Database Schema (Firestore)

The application persists tasks in Firestore collections matching the structure outlined in `/firebase-blueprint.json`:

```json
{
  "tasks": {
    "id": "string (Unique identifier)",
    "userId": "string (Matches authenticated Firebase UID)",
    "title": "string (Task header, 1-200 characters)",
    "description": "string (Optional task notes)",
    "dueDate": "string (ISO 8601 formatted date if applicable)",
    "priority": "string ('high' | 'medium' | 'low')",
    "completed": "boolean",
    "googleEventId": "string | null (Linked Google Calendar unique event ID)",
    "meetLink": "string | null (Interactive Google Meet address link)",
    "googleTaskId": "string | null (Synced Google Task ID)",
    "createdAt": "timestamp (Server Timestamp on creation)",
    "updatedAt": "timestamp (Server Timestamp on change update events)"
  }
}
```

---

## Developer Operations

- **Vite Configurations**: Embedded assets, proxy directives, and dev server options are safely managed via `vite.config.ts`.
- **Database Hardening**: Strict validation rules reside inside `firestore.rules`. These regulations ensure users can only rewrite or delete tasks belonging strictly to their authenticated account identifier (`auth.uid`).
- **Dependencies Management**: Package registries, developer scripts, and target Node compatibility are stored dynamically in `package.json`.
