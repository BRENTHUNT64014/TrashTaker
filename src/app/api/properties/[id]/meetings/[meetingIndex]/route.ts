import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Property from '@/models/Property';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; meetingIndex: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, meetingIndex } = await params;
    const { aiNotes } = await request.json();

    await dbConnect();

    const property = await Property.findById(id);
    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const index = parseInt(meetingIndex, 10);
    if (isNaN(index) || !property.meetings || index < 0 || index >= property.meetings.length) {
      return NextResponse.json({ error: 'Invalid meeting index' }, { status: 400 });
    }

    // Update the AI notes for the specific meeting
    property.meetings[index].aiNotes = aiNotes;
    await property.save();

    return NextResponse.json({ success: true, meeting: property.meetings[index] });
  } catch (error: any) {
    console.error('Error updating meeting notes:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update meeting notes' },
      { status: 500 }
    );
  }
}
