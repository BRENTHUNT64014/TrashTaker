# Google Tasks Integration

## Overview
Your tasks are now fully integrated with Google Tasks, allowing bi-directional synchronization between your CRM and Google's task management system.

## Features

### 1. **Automatic Push to Google Tasks**
When you create or update tasks in the CRM:
- ✅ **Create**: New tasks automatically sync to Google Tasks
- ✅ **Update**: Changes (title, description, status, due date) sync to Google Tasks
- ✅ **Delete**: Removing a task also deletes it from Google Tasks
- ✅ **Status Sync**: "Completed" status syncs as completed in Google Tasks

### 2. **Pull from Google Tasks**
Use the **Sync** button to import tasks from Google Tasks:
- Imports ALL tasks from ALL Google Task lists
- Creates new tasks in the database if they don't exist
- Updates existing tasks if they were modified in Google
- Preserves relationships (properties, contacts, companies)

### 3. **Visual Indicators**
- Tasks synced with Google show a blue Google icon (🔵)
- Task dialog displays a sync notification
- Sync button shows import/update counts

## How to Use

### Creating Tasks
1. Click "Add Task" button anywhere in the CRM
2. Fill in task details (title, description, due date, priority, etc.)
3. Click "Create Task"
4. Task is automatically created in both the database AND Google Tasks

### Syncing from Google Tasks
1. Go to any property's Tasks section
2. Click the "Sync" button (🔄 icon)
3. Wait for sync to complete
4. View imported tasks in the list

### Updating Tasks
1. Edit any task in the CRM
2. Changes automatically sync to Google Tasks
3. No manual action required

### Deleting Tasks
1. Delete a task from the CRM
2. It's automatically removed from Google Tasks
3. No orphaned tasks

## Technical Details

### API Endpoints

#### `POST /api/tasks`
- Creates task in database
- Syncs to Google Tasks
- Returns task with `googleTaskId` and `googleTaskListId`

#### `PATCH /api/tasks?id=TASK_ID`
- Updates task in database
- Syncs changes to Google Tasks (if task has `googleTaskId`)

#### `DELETE /api/tasks?id=TASK_ID`
- Deletes task from database
- Removes from Google Tasks (if task has `googleTaskId`)

#### `POST /api/tasks/sync`
- Pulls all tasks from Google Tasks
- Creates/updates tasks in database
- Returns count of imported and updated tasks

### Database Schema
```typescript
{
  title: string;
  description?: string;
  dueDate?: Date;
  priority: 'Low' | 'Medium' | 'High';
  status: 'To Do' | 'In Progress' | 'Completed';
  assignedTo?: ObjectId;
  property?: ObjectId;
  contact?: ObjectId;
  company?: ObjectId;
  createdBy: ObjectId;
  completedAt?: Date;
  googleTaskId?: string;        // Google Tasks ID (if synced)
  googleTaskListId?: string;    // Google Task List ID (if synced)
  notes?: Array<{...}>;
}
```

### Google Tasks Mapping
| CRM Field | Google Tasks Field |
|-----------|-------------------|
| title | title |
| description | notes |
| dueDate | due |
| status: "Completed" | status: "completed" |
| status: "To Do" / "In Progress" | status: "needsAction" |

## Sync Behavior

### First Sync
- All Google Tasks are imported as new tasks
- Created with default priority: "Medium"
- Assigned to the user performing the sync

### Subsequent Syncs
- Existing tasks (matched by `googleTaskId`) are updated
- New tasks in Google are imported
- Tasks deleted in Google remain in the database (soft sync)

### Conflict Resolution
- CRM updates always push to Google Tasks
- Manual sync pulls from Google Tasks
- Last write wins (no merge conflicts)

## Troubleshooting

### Task Not Syncing to Google
1. Check if user is authenticated with Google
2. Verify Google Tasks API scope is enabled
3. Check browser console for errors
4. Try recreating the task

### Task Not Appearing After Sync
1. Refresh the page after sync completes
2. Check that the task list in Google Tasks isn't hidden
3. Verify task isn't filtered out (e.g., completed tasks on some views)

### Duplicate Tasks
- Each Google Task has a unique `googleTaskId`
- Duplicates only occur if sync is interrupted
- Safe to manually delete duplicates

## Permissions Required
- ✅ Google Tasks API: `https://www.googleapis.com/auth/tasks`
- ✅ Already configured in NextAuth

## Files Modified
- `src/lib/google-tasks.ts` - Core sync functions
- `src/app/api/tasks/route.ts` - CRUD + push sync
- `src/app/api/tasks/sync/route.ts` - Pull sync endpoint
- `src/components/tasks/task-dialog.tsx` - Sync indicator
- `src/app/dashboard/crm/properties/[id]/page.tsx` - Sync button
- `src/models/Task.ts` - Added googleTaskId fields

## Future Enhancements
- [ ] Real-time sync with webhooks
- [ ] Selective task list import
- [ ] Bi-directional note sync
- [ ] Conflict resolution UI
- [ ] Background sync scheduler
