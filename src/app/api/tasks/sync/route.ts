import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Task from '@/models/Task';
import { syncGoogleTasks } from '@/lib/google-tasks';

/**
 * Sync tasks between Google Tasks and the database
 * 
 * This endpoint performs a PULL operation:
 * - Fetches all tasks from all Google Task lists
 * - Creates new tasks in the database for tasks that don't exist
 * - Updates existing tasks if they already exist (matched by googleTaskId)
 * 
 * PUSH operations (database → Google Tasks) happen automatically:
 * - POST /api/tasks - Creates task in both database AND Google Tasks
 * - PATCH /api/tasks/[id] - Updates task in both database AND Google Tasks  
 * - DELETE /api/tasks/[id] - Deletes task from both database AND Google Tasks
 * 
 * Sync Status:
 * - Tasks with googleTaskId field are synced with Google
 * - Tasks without googleTaskId are local-only (not synced)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !session.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const result = await syncGoogleTasks(
      session.accessToken as string,
      session.user.id as string
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to sync tasks' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      imported: result.imported || 0,
      updated: result.updated || 0,
      message: `Synced ${result.imported} new tasks and updated ${result.updated} existing tasks`,
    });
  } catch (error) {
    console.error('Error syncing Google Tasks:', error);
    return NextResponse.json(
      { error: 'Failed to sync tasks' },
      { status: 500 }
    );
  }
}
