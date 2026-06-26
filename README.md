# Google Workspace-Integrated Task Manager

A highly polished, modern single-page task management application built with **React**, **Vite**, **TypeScript**, and **Tailwind CSS**. It is fully integrated with **Firebase** (Authentication & Firestore) and the **Google Workspace APIs** (Google Calendar, Google Meet, and Google Tasks) to provide real-time synchronization of tasks, deadlines, and virtual video conferences.

---

## Key Features

- **Secure Authentication**: Google Sign-In powered by **Firebase Authentication** with auto-requesting of Google API integration credentials.
- **Real-Time Synergy**: Auto-saves lists, tasks, and state transitions directly to **Cloud Firestore**.
- **Google Calendar Sync**: Creating a task with a deadline automatically creates a corresponding Google Calendar event on your synced accounts.
- **Google Meet Generation**: Create official virtual Google Meet video conference links directly from the task interface with one click.
- **Google Tasks Integration**: Synced tasks are bound directly to your Google Account’s default list, letting you toggle task completion statuses, modify descriptions, and delete events seamlessly between platforms.
- **Dynamic Google Forms Generation**: Create and sync professional registration/intake questionnaires. Creates official Google Forms outlines directly in your account.
- **Secure Responses Hub**: Live Google Form guest registrations flow straight into your dashboard and are fetchable in real-time, preserving strict cloud-grade database safety and data ownership.
- **Interactive Gmail Broadcasts**: Deliver direct schedule details, structured summaries, and Google Meet integration video links to registered attendees using automated Gmail API emailing.
- **Destructive Safety Guards**: Beautiful, soft custom modal Overlays guard destructive delete operations on synced Workspace elements to prevent accidental data loss.

---

## Architectural Breakdown

1. **Frontend Core**: React 19 + TypeScript + Tailwind CSS configured with a tailored, modern color palette.
2. **Serverless Database**: Cloud Firestore handles sub-second document snapshot synchronization with verified database security rules (`firestore.rules`).
3. **Identity & Auth Provider**: Firebase Authentication prompts popup-based Google OAuth providers caching valid dynamic Access Tokens in-memory for downstream API integrations.
4. **Google API Layer**: Low-overhead native fetch queries proxying actions straight into the REST endpoints of `googleapis.com` for maximum reliability and minimum payload sizes.

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
   - Replace the values there with your new web app details:
     ```json
     {
       "projectId": "your-firebase-project-id",
       "appId": "your-app-id",
       "apiKey": "your-web-api-key",
       "authDomain": "your-auth-domain.firebaseapp.com",
       "firestoreDatabaseId": "(default)",
       "storageBucket": "your-storage-bucket.appspot.com",
       "messagingSenderId": "your-sender-id"
     }
     ```
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
   - From the projects dropdown search and select your Firebase Project ID (e.g., `smart-parking-alert-e552c` or your custom project).

2. **Enable the Necessary APIs**:
   Search for and click **Enable** for the following APIs under the "APIs & Services" -> "Library" menu:
   - 📅 **Google Calendar API** (Required for syncing events and schedules)
   - 📞 **Google Meet API** / **Google Hangouts Meet API** (Required for creating dynamic meetings space links)
   - 📝 **Google Tasks API** (Required for pushing to default lists)
   - 📄 **Google Forms API** (Required for creating robust customizable dynamic sign-up questionnaires)
   - 📧 **Gmail API** (Required for broadcasting automated updates and event schedules)

3. **Configure OAuth Consent Screen & Scopes**:
   - Scroll to **APIs & Services** > **OAuth consent screen**.
   - Set user type to **External** and complete the mandatory form details.
   - On the **Scopes** step, click **Add or Remove Scopes**.
   - Paste or check the following OAuth scopes requested by this application:
     - `https://www.googleapis.com/auth/calendar.events` (Manage calendar events)
     - `https://www.googleapis.com/auth/meetings.space.created` (Create Google Meet video calls)
     - `https://www.googleapis.com/auth/tasks` (Access, edit, and delete Google Tasks)
     - `https://www.googleapis.com/auth/forms.body` (Create and update Google Forms)
     - `https://www.googleapis.com/auth/forms.responses.readonly` (Read registration responses from Google Forms)
     - `https://www.googleapis.com/auth/gmail.send` (Send event update and invitation emails on user's behalf)
   - Add your own Google Account as a **Test User** (highly critical if the application is still in "Testing" mode on the consent page). Save changes.

---

### Step 3: Run the Application Locally

1. **Install Dependencies**:
   Navigate to the project root directory in your terminal and run:
   ```bash
   npm install
   ```

2. **Configure Environmental Variables**:
   Copy `.env.example` to `.env` to declare secrets (optional local setup - the production applet injects runtime variables automatically):
   ```bash
   cp .env.example .env
   ```
   Modify `.env` to declare any custom APIs if expanding downstream services (e.g., Gemini API keys).

3. **Start Development Server**:
   Launch the high-performance Vite dev server with Hot Module Replacement on Port 3000:
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

The application persists tasks and form schedules in Firestore collections matching the structure outlined in `/firebase-blueprint.json`:

```json
{
  "tasks": {
    "id": "string (Unique identifier)",
    "userId": "string (Matches authenticated Firebase UID)",
    "title": "string (Task header, 1-200 characters)",
    "description": "string (Optional task notes)",
    "dueDate": "string (ISO 8601 formatted date if applicable)",
    "completed": "boolean",
    "googleEventId": "string | null (Linked Google Calendar unique event ID)",
    "meetLink": "string | null (Interactive Google Meet address link)",
    "googleTaskId": "string | null (Synced Google Task ID)",
    "createdAt": "timestamp (Server Timestamp on creation)",
    "updatedAt": "timestamp (Server Timestamp on change update events)"
  },
  "registration_forms": {
    "taskId": "string (Unique identifier of the task)",
    "userId": "string (UID of the creator user)",
    "title": "string (Portal header)",
    "description": "string (Portal subtitle)",
    "meetLink": "string | null (Connected dynamic Google Meet link)",
    "fields": "array of question schema objects",
    "googleFormUrl": "string | null (Public web signup url)",
    "googleFormId": "string | null (Editable form ID)"
  }
}
```

---

## Developer Operations

- **Vite Configurations**: Embedded assets, proxy directives, and dev server options are safely managed via `vite.config.ts`.
- **Database Hardening**: Strict validation rules reside inside `firestore.rules`. These regulations ensure users can only rewrite or delete tasks belonging strictly to their authenticated account identifier (`auth.uid`).
- **Dependencies Management**: Package registries, developer scripts, and target Node compatibility are stored dynamically in `package.json`.
