# Project Description

## Overview

This project is a highly polished, modern single-page task management application built with **React**, **Vite**, **TypeScript**, and **Tailwind CSS**. It is fully integrated with **Firebase** (Authentication & Firestore) and a comprehensive suite of **Google Workspace APIs** (Calendar, Meet, Tasks, Docs, Slides, Sheets, Keep, Classroom, Forms, and Gmail) to provide real-time synchronization of tasks, deadlines, and AI-powered productivity planning.

## How the App Works

The application unifies task management, AI productivity planning, and Google Workspace into a single, cohesive workflow:

1. **Authentication & Authorization**: When a user logs in, Firebase Authentication securely handles their Google identity, whilst silently requesting OAuth scopes. This immediately unlocks the ability to communicate directly with their calendar, tasks, drive, and other connected Google services.
2. **Task Creation & Syncing**: A user creates a task (e.g., "Prepare Q3 Marketing Presentation") and sets a deadline. The application instantly:
   - Saves the task persistently to **Cloud Firestore**.
   - Creates a **Google Calendar** event at the specified time.
   - Syncs the item to the user's default **Google Tasks** list.
   - (Optional) Generates a secure **Google Meet** virtual room link for collaboration.
3. **AI-Powered Automatic Prioritization**: The integrated Gemini AI automatically evaluates incoming tasks and dynamically assigns them a priority level (High, Medium, or Low). The system actively monitors due dates, escalating urgency as deadlines approach (e.g., within 24 hours), ensuring the most critical work is prominently highlighted on your dashboard.
4. **Interactive Productivity Coach & Email Drafter**: If a user is overwhelmed, they can engage the built-in AI Productivity Coach in the Self-Directed Activity dashboard. The Gemini model analyzes the active task payload to generate step-by-step execution plans. Directly beside the coach is a specialized AI Email Drafter that contextually creates professional email drafts and pushes them straight to your connected Gmail account.
5. **Workspace Action Plan Generation**: With a single click from the dashboard, the user can turn the AI's step-by-step advice into tangible Google Workspace artifacts. The application securely contacts Google APIs to generate populated Google Docs, structured Google Slides, templated Google Sheets, Keep notes, or Classroom instances—saving hours of manual setup.
6. **Dynamic Forms & Mass Communication**: For event management and coordination, the app supports generating customized Google Forms dynamically. Furthermore, an integrated Mass Email Sender feature allows organizers to batch-send communications to event participants or team members efficiently.
7. **Task Execution & Updates**: The user can check off tasks directly from the main view, the Self-Directed Activity Dashboard, or the Calendar View. Changes immediately sync back to Google Tasks and Firestore.

## What You Can Do With This App (Capabilities)

Here are the specific capabilities and actions users can perform:

### 1. Unified Task & Event Management
- **Create Tasks**: Create tasks with titles, descriptions, due dates, priorities, and assignees.
- **Toggle Completion**: Mark tasks as done quickly across multiple views (Kanban, Calendar, Self-Directed Activity).
- **View Modes**: Switch between a Kanban board for workflow states, a Calendar View for date-oriented planning, and a unified list view.
- **Smart Priority Scaling**: Tasks are automatically triaged by Gemini into High, Medium, or Low urgency, visually badged and dynamically scaled based on proximity to deadlines.

### 2. Deep Google Workspace Integrations
- **Google Calendar Sync**: Create tasks that automatically generate calendar events. View upcoming events directly inside the app's Calendar Dashboard sidebar.
- **Google Tasks Sync**: Keep your app tasks perfectly synchronized with your official Google Tasks app (both directions).
- **Google Classroom Import**: Pull your active coursework assignments into your central task list so you never miss a school deadline.
- **Google Meet Generation**: Generate virtual meeting links with one click and attach them to team tasks.

### 3. AI-Powered Productivity
- **Productivity Coach Chat**: Chat directly with an intelligent AI coach that understands your current workload and helps you plan your day, overcome procrastination, or structure complex tasks.
- **Contextual AI Email Drafter**: An integrated panel dedicated to drafting context-aware emails with Gemini. Input your topic, and the AI writes a professional email and saves it directly to your Gmail Drafts.
- **Action Plan Generation**: Select any complex task and ask the AI to generate a detailed, step-by-step action plan.
- **High-Thinking Mode**: Enable "High Thinking" for deep, complex reasoning on large projects.

### 4. Event Management & Scaled Outreach
- **Google Forms Generation**: Automatically instantiate customizable sign-up questionnaires, event registration pages, and feedback forms tied directly to your tasks.
- **Mass Email Sender**: Within the Event Management session, utilize the mass sender utility to distribute updates, links, and forms to lists of team members or attendees simultaneously.

### 5. AI-Driven Workspace Artifact Generation
Instead of just giving you advice, the app can actually *create* the starting documents for you based on the AI's plan:
- 📝 **Google Docs**: Instantiate a formatted action plan document.
- 📊 **Google Slides**: Generate a presentation outline for task execution.
- 📈 **Google Sheets**: Initialize a new project tracking spreadsheet.
- 💡 **Google Keep**: Create quick reference notes for task steps.
- 🎓 **Google Classroom**: Provision new Classroom courses for larger projects.

### 6. Seamless Workflows
- **Dedicated Calendar Dashboard**: A focused view to see the month at a glance, click on dates to add tasks, and view sidebars separating your upcoming Team Events from Self-Directed Personal tasks.
- **Self-Directed Activity Dashboard**: A dedicated zone for executing personal tasks, interacting with the AI productivity coach, and utilizing the AI Email Drafter.
- **Destructive Safety Guards**: Beautiful, soft custom modal Overlays guard destructive delete operations on synced Workspace elements to prevent accidental data loss.
