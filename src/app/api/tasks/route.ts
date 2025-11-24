import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Task from '@/models/Task';
import User from '@/models/User';
import { createGoogleTask } from '@/lib/google-tasks';
import { google } from 'googleapis';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');
    const contactId = searchParams.get('contactId');
    const companyId = searchParams.get('companyId');

    const filter: any = {};
    if (propertyId) filter.property = propertyId;
    if (contactId) filter.contact = contactId;
    if (companyId) filter.company = companyId;

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const data = await request.json();
    
    // Auto-assign to logged-in user if no assignee specified
    const taskData = {
      ...data,
      createdBy: session.user.id,
      assignedTo: data.assignedTo || session.user.id,
    };

    // Create task in database first
    const task = await Task.create(taskData);

    // Create Google Calendar event with reminder if user has access token and due date
    if (session.accessToken && data.dueDate) {
      try {
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET
        );

        oauth2Client.setCredentials({
          access_token: session.accessToken,
          refresh_token: session.refreshToken,
        });

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        // Parse due date and set time to 9 AM if no time specified
        const dueDateTime = new Date(data.dueDate);
        if (dueDateTime.getHours() === 0) {
          dueDateTime.setHours(9, 0, 0, 0);
        }

        // Create 1-hour event
        const endDateTime = new Date(dueDateTime);
        endDateTime.setHours(endDateTime.getHours() + 1);

        const reminderMinutes = data.reminderMinutes || 30;

        const calendarEvent = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: {
            summary: `[${data.taskType || 'Task'}] ${data.title}`,
            description: data.description || '',
            start: {
              dateTime: dueDateTime.toISOString(),
              timeZone: 'America/Chicago',
            },
            end: {
              dateTime: endDateTime.toISOString(),
              timeZone: 'America/Chicago',
            },
            reminders: {
              useDefault: false,
              overrides: reminderMinutes > 0 ? [
                { method: 'popup', minutes: reminderMinutes },
                { method: 'email', minutes: reminderMinutes },
              ] : [],
            },
            colorId: data.priority === 'High' ? '11' : data.priority === 'Medium' ? '5' : '2',
          },
        });

        // Save Google Calendar Event ID
        if (calendarEvent.data.id) {
          task.googleCalendarEventId = calendarEvent.data.id;
          await task.save();
          console.log('Task added to Google Calendar with reminder:', calendarEvent.data.id);
        }
      } catch (googleError: any) {
        console.error('Error syncing to Google Calendar:', googleError);
      }
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
