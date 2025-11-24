import { google } from 'googleapis';

export async function getGoogleCalendarClient(accessToken: string, refreshToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

export interface CalendarEvent {
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  attendees?: Array<{ email: string }>;
  conferenceData?: {
    createRequest: {
      requestId: string;
      conferenceSolutionKey: { type: string };
    };
  };
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{ method: string; minutes: number }>;
  };
}

export async function createCalendarEvent(
  accessToken: string,
  refreshToken: string,
  event: CalendarEvent
) {
  const calendar = await getGoogleCalendarClient(accessToken, refreshToken);

  const response = await calendar.events.insert({
    calendarId: 'primary',
    conferenceDataVersion: event.conferenceData ? 1 : 0,
    requestBody: event,
  });

  return response.data;
}

export async function updateCalendarEvent(
  accessToken: string,
  refreshToken: string,
  eventId: string,
  event: CalendarEvent
) {
  const calendar = await getGoogleCalendarClient(accessToken, refreshToken);

  const response = await calendar.events.update({
    calendarId: 'primary',
    eventId: eventId,
    requestBody: event,
  });

  return response.data;
}

export async function deleteCalendarEvent(
  accessToken: string,
  refreshToken: string,
  eventId: string
) {
  const calendar = await getGoogleCalendarClient(accessToken, refreshToken);

  await calendar.events.delete({
    calendarId: 'primary',
    eventId: eventId,
  });
}

export async function getCalendarEvents(
  accessToken: string,
  refreshToken: string,
  timeMin?: string,
  timeMax?: string
) {
  const calendar = await getGoogleCalendarClient(accessToken, refreshToken);

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: timeMin || new Date().toISOString(),
    timeMax: timeMax,
    singleEvents: true,
    orderBy: 'startTime',
  });

  return response.data.items || [];
}
