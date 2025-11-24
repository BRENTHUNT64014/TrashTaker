import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Task from '@/models/Task';
import mongoose from 'mongoose';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { content } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Note content is required' }, { status: 400 });
    }

    await dbConnect();

    const task = await Task.findByIdAndUpdate(
      id,
      {
        $push: {
          notes: {
            content: content.trim(),
            createdBy: new mongoose.Types.ObjectId(session.user.id),
            createdAt: new Date(),
          },
        },
      },
      { new: true }
    )
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
    console.error('Error adding note:', error);
    return NextResponse.json({ error: 'Failed to add note' }, { status: 500 });
  }
}
