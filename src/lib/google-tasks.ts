import { google } from 'googleapis';

export async function createGoogleTask(
  accessToken: string,
  task: {
    title: string;
    description?: string;
    dueDate?: string;
    status?: string;
  }
) {
  try {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const tasks = google.tasks({ version: 'v1', auth: oauth2Client });

    // Get or create the default task list
    const taskListsResponse = await tasks.tasklists.list();
    const defaultTaskList = taskListsResponse.data.items?.[0]?.id;

    if (!defaultTaskList) {
      throw new Error('No task list found');
    }

    // Format due date if provided (Google Tasks expects RFC 3339 timestamp)
    let due: string | undefined;
    if (task.dueDate) {
      const dueDateTime = new Date(task.dueDate);
      // Set to end of day UTC
      dueDateTime.setUTCHours(23, 59, 59, 999);
      due = dueDateTime.toISOString();
    }

    // Create the task
    const response = await tasks.tasks.insert({
      tasklist: defaultTaskList,
      requestBody: {
        title: task.title,
        notes: task.description || '',
        due: due,
        status: task.status === 'Completed' ? 'completed' : 'needsAction',
      },
    });

    return {
      success: true,
      googleTaskId: response.data.id,
      taskListId: defaultTaskList,
    };
  } catch (error) {
    console.error('Error creating Google Task:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function updateGoogleTask(
  accessToken: string,
  taskListId: string,
  googleTaskId: string,
  updates: {
    title?: string;
    description?: string;
    dueDate?: string;
    status?: string;
  }
) {
  try {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const tasks = google.tasks({ version: 'v1', auth: oauth2Client });

    // Format due date if provided
    let due: string | undefined;
    if (updates.dueDate) {
      const dueDateTime = new Date(updates.dueDate);
      dueDateTime.setUTCHours(23, 59, 59, 999);
      due = dueDateTime.toISOString();
    }

    const response = await tasks.tasks.update({
      tasklist: taskListId,
      task: googleTaskId,
      requestBody: {
        title: updates.title,
        notes: updates.description,
        due: due,
        status: updates.status === 'Completed' ? 'completed' : 'needsAction',
      },
    });

    return {
      success: true,
      googleTaskId: response.data.id,
    };
  } catch (error) {
    console.error('Error updating Google Task:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function deleteGoogleTask(
  accessToken: string,
  taskListId: string,
  googleTaskId: string
) {
  try {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const tasks = google.tasks({ version: 'v1', auth: oauth2Client });

    await tasks.tasks.delete({
      tasklist: taskListId,
      task: googleTaskId,
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting Google Task:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function syncGoogleTasks(
  accessToken: string,
  userId: string
) {
  try {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const tasks = google.tasks({ version: 'v1', auth: oauth2Client });

    // Get all task lists
    const taskListsResponse = await tasks.tasklists.list();
    const taskLists = taskListsResponse.data.items || [];

    let imported = 0;
    let updated = 0;

    // Import from MongoDB to get existing tasks
    const mongoose = require('mongoose');
    const Task = mongoose.models.Task || require('@/models/Task').default;

    // Fetch all Google Tasks from all lists
    for (const taskList of taskLists) {
      const tasksResponse = await tasks.tasks.list({
        tasklist: taskList.id!,
        showCompleted: true,
        showHidden: true,
      });

      const googleTasks = tasksResponse.data.items || [];

      for (const googleTask of googleTasks) {
        // Check if task already exists in our database
        const existingTask = await Task.findOne({
          googleTaskId: googleTask.id,
          googleTaskListId: taskList.id,
        });

        // Map Google Task status to our status
        let status: 'To Do' | 'In Progress' | 'Completed' = 'To Do';
        if (googleTask.status === 'completed') {
          status = 'Completed';
        }

        // Parse due date
        let dueDate: Date | undefined;
        if (googleTask.due) {
          dueDate = new Date(googleTask.due);
        }

        if (existingTask) {
          // Update existing task
          existingTask.title = googleTask.title || existingTask.title;
          existingTask.description = googleTask.notes || existingTask.description;
          existingTask.status = status;
          existingTask.dueDate = dueDate;
          if (status === 'Completed' && !existingTask.completedAt) {
            existingTask.completedAt = new Date();
          }
          await existingTask.save();
          updated++;
        } else {
          // Create new task
          await Task.create({
            title: googleTask.title || 'Untitled Task',
            description: googleTask.notes || '',
            status,
            dueDate,
            priority: 'Medium',
            createdBy: userId,
            googleTaskId: googleTask.id,
            googleTaskListId: taskList.id,
            completedAt: status === 'Completed' ? new Date() : undefined,
          });
          imported++;
        }
      }
    }

    return {
      success: true,
      imported,
      updated,
    };
  } catch (error) {
    console.error('Error syncing Google Tasks:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
