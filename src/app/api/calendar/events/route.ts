import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createCalendarEvent } from '@/lib/google-calendar';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.accessToken || !session.refreshToken) {
      return NextResponse.json(
        { error: 'Google Calendar not connected. Please sign in with Google.' },
        { status: 400 }
      );
    }

    const { summary, description, location, startDateTime, endDateTime, attendees, addGoogleMeet } = await request.json();

    if (!summary || !startDateTime || !endDateTime) {
      return NextResponse.json(
        { error: 'Missing required fields: summary, startDateTime, endDateTime' },
        { status: 400 }
      );
    }

    const eventData: any = {
      summary,
      description,
      location,
      start: {
        dateTime: startDateTime,
        timeZone: 'America/Chicago',
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'America/Chicago',
      },
      attendees: attendees?.map((email: string) => ({ email })),
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 },
        ],
      },
    };

    if (addGoogleMeet) {
      eventData.conferenceData = {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      };
    }

    const event = await createCalendarEvent(
      session.accessToken as string,
      session.refreshToken as string,
      eventData
    );

    return NextResponse.json({ success: true, event });
  } catch (error: any) {
    console.error('Error creating calendar event:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create calendar event' },
      { status: 500 }
    );
  }
}
