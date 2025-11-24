import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Task from '@/models/Task';
import { updateGoogleTask, deleteGoogleTask } from '@/lib/google-tasks';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    const task = await Task.findById(id)
      .populate('assignedTo', 'name email')
      .populate('property', 'name propertyName')
      .populate('contact', 'firstName lastName email')
      .populate('company', 'name')
      .populate('createdBy', 'name email')
      .populate('notes.createdBy', 'name email');

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const updates = await request.json();
    await dbConnect();

    const task = await Task.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('assignedTo', 'name email')
      .populate('property', 'name propertyName')
      .populate('contact', 'firstName lastName email')
      .populate('company', 'name')
      .populate('createdBy', 'name email');

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Sync updates to Google Tasks if it exists
    if (task.googleTaskId && task.googleTaskListId && session.accessToken) {
      try {
        await updateGoogleTask(
          session.accessToken as string,
          task.googleTaskListId,
          task.googleTaskId,
          {
            title: task.title,
            description: task.description,
            dueDate: task.dueDate?.toISOString(),
            status: task.status,
          }
        );
        console.log('Task synced to Google Tasks');
      } catch (googleError) {
        console.error('Failed to sync update to Google Tasks:', googleError);
      }
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    const task = await Task.findById(id);

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Delete from Google Tasks if it exists
    if (task.googleTaskId && task.googleTaskListId && session.accessToken) {
      try {
        await deleteGoogleTask(
          session.accessToken as string,
          task.googleTaskListId,
          task.googleTaskId
        );
        console.log('Task deleted from Google Tasks');
      } catch (googleError) {
        console.error('Failed to delete from Google Tasks:', googleError);
      }
    }

    // Delete from database
    await Task.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
