import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Property from '@/models/Property';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { calendarEventId, aiNotes } = await request.json();

    if (!calendarEventId) {
      return NextResponse.json({ error: 'Calendar event ID is required' }, { status: 400 });
    }

    await dbConnect();

    const property = await Property.findById(id);
    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Find the meeting by calendarEventId
    const meetingIndex = property.meetings?.findIndex(
      (m: any) => m.calendarEventId === calendarEventId
    );

    if (meetingIndex === undefined || meetingIndex === -1) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Update the AI notes for the specific meeting
    property.meetings[meetingIndex].aiNotes = aiNotes;
    await property.save();

    return NextResponse.json({ 
      success: true, 
      meeting: property.meetings[meetingIndex] 
    });
  } catch (error: any) {
    console.error('Error updating meeting notes:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update meeting notes' },
      { status: 500 }
    );
  }
}
