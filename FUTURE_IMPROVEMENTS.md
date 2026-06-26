# Potential Future Improvements

This document outlines four potential future improvements for the Google Workspace-Integrated Task Manager, along with step-by-step implementation plans.

## 1. Recurring Tasks (Schedule Support)
**Description:** Allow tasks to automatically recreate themselves on a daily, weekly, or monthly schedule.

**Implementation Steps:**
1. **Schema Update:** Add `recurringConfig` to the Firestore `tasks` schema to store recurrence patterns (e.g., `{ type: 'weekly', days: [1, 3, 5] }`).
2. **UI Update:** Add a "Repeat" dropdown and configuration modal in `TaskForm.tsx` to let users select recurrence patterns when creating a task.
3. **Calendar Integration:** Map the recurring config to Google Calendar API's `recurrence` array using standard RFC5545 RRULE format so the events repeat on Google Calendar natively.
4. **Background Re-creation:** When a user completes a recurring task, intercept the complete action in the frontend. Instead of just marking it complete, duplicate the task document in Firestore with the `dueDate` pushed forward according to the `recurringConfig`.

## 2. Team Collaboration & Task Delegation
**Description:** Allow users to share tasks and assign them to other team members within their Workspace.

**Implementation Steps:**
1. **Permissions Update:** Modify `firestore.rules` to check a new `sharedWith` array containing UIDs or emails, allowing read/write access to delegated users, not just the creator.
2. **Schema Update:** Add an `assigneeId` and `assigneeEmail` field to the task schema.
3. **Google Workspace Syncing:**
   - When generating a Google Calendar event, add the `assigneeEmail` to the `attendees` array so they receive an invite.
   - When generating Google Docs or Sheets via the AI coach, use the Google Drive API's `permissions.create` endpoint to explicitly share the newly generated artifact with the assignee.
4. **UI Update:** Build a "Team" tab to visualize users (via Firebase Auth profiles) and add an "Assign to..." combobox inside `TaskItem.tsx`.

## 3. Advanced AI Task Sub-division (Nested Subtasks)
**Description:** Use the Gemini API to automatically break down large, complex tasks into manageable subtasks displayed in a hierarchical tree.

**Implementation Steps:**
1. **Schema Update:** Introduce a `parentId` field (nullable) to the `tasks` schema to establish a parent-child relationship.
2. **API Endpoint Update:** Create an Express route `/api/subdivide-task` that uses `gemini-3.5-flash` with structured JSON output instructions to generate an array of sub-steps for a given task title.
3. **Frontend Integration:** Add a "Subdivide with AI" button on complex tasks. When clicked, call the API, iterate through the returned sub-steps, and batch-write them to Firestore as new task documents containing the `parentId`.
4. **UI Update:** Update the Dashboard to group tasks by `parentId` using a nested accordion or indented list view, ensuring that parent tasks automatically calculate their completion percentage based on children.

## 4. Offline Mode & PWA Support
**Description:** Enable users to view and create tasks without an active internet connection, syncing changes to the cloud once reconnected.

**Implementation Steps:**
1. **Firestore Offline Persistence:** Call `enableIndexedDbPersistence(db)` during Firebase initialization in the frontend to cache the database locally.
2. **PWA Manifest:** Create a `manifest.json` defining the app's icons, theme colors, and standalone display mode to allow mobile installation.
3. **Service Worker:** Use Vite's `vite-plugin-pwa` to register a service worker that caches the React application shell, CSS, and critical Google Fonts.
4. **Offline Sync Queue:** For Google Workspace API calls (Calendar, Meet, Docs), implement a local queue using IndexedDB. If the user creates a task while offline, Firestore will handle its own sync, but the Google API actions must be stored locally and executed sequentially by a background sync listener once the `window.ononline` event fires.
