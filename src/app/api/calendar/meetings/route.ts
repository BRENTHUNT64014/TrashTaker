import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { google } from 'googleapis';
import dbConnect from '@/lib/mongodb';
import Contact from '@/models/Contact';
import Property from '@/models/Property';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !session.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      title,
      description,
      startDateTime,
      duration,
      propertyId,
      contactIds,
      additionalAttendees,
    } = await request.json();

    if (!title || !startDateTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await dbConnect();

    // Initialize Google Calendar API
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: session.accessToken as string });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Calculate end time
    const startDate = new Date(startDateTime);
    const endDate = new Date(startDate.getTime() + duration * 60000);

    // Collect all attendee emails
    const attendees: { email: string }[] = [];

    // Add contacts if provided
    if (contactIds && contactIds.length > 0) {
      const contacts = await Contact.find({ _id: { $in: contactIds } });
      contacts.forEach((contact) => {
        if (contact.email) {
          attendees.push({ email: contact.email });
        }
      });
    }

    // Add additional attendees
    if (additionalAttendees && additionalAttendees.length > 0) {
      additionalAttendees.forEach((email: string) => {
        attendees.push({ email });
      });
    }

    // Create event with Google Meet
    const event = {
      summary: title,
      description: description || '',
      start: {
        dateTime: startDate.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      attendees: attendees.length > 0 ? attendees : undefined,
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 30 }, // 30 minutes before
        ],
      },
    };

    // Create the calendar event
    const response = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      sendUpdates: 'all', // Send email invites to all attendees
      requestBody: event,
    });

    const createdEvent = response.data;

    // Save meeting to property if propertyId is provided
    if (propertyId) {
      try {
        const property = await Property.findById(propertyId);
        if (property) {
          if (!property.meetings) {
            property.meetings = [];
          }

          // Store the meeting with calendar event ID to fetch recording/transcript later
          property.meetings.push({
            title: title,
            date: startDate,
            meetLink: createdEvent.hangoutLink || '',
            aiNotes: '', // Will be populated from Google Meet recording/transcript
            attendees: attendees.map((a) => a.email),
            calendarEventId: createdEvent.id || '',
          });

          await property.save();
          console.log('Meeting saved to property:', propertyId);
        }
      } catch (error) {
        console.error('Error saving meeting to property:', error);
        // Don't fail the request if property save fails
      }
    }

    return NextResponse.json({
      success: true,
      eventId: createdEvent.id,
      meetLink: createdEvent.hangoutLink,
      htmlLink: createdEvent.htmlLink,
      event: {
        title: createdEvent.summary,
        description: createdEvent.description,
        start: createdEvent.start?.dateTime,
        end: createdEvent.end?.dateTime,
        attendees: createdEvent.attendees?.map((a) => a.email),
        meetLink: createdEvent.hangoutLink,
      },
    });
  } catch (error: any) {
    console.error('Error creating meeting:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create meeting' },
      { status: 500 }
    );
  }
}
