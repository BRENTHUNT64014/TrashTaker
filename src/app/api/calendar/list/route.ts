import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getCalendarEvents } from '@/lib/google-calendar';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.accessToken || !session.refreshToken) {
      return NextResponse.json(
        { error: 'Google Calendar not connected' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const timeMin = searchParams.get('timeMin') || undefined;
    const timeMax = searchParams.get('timeMax') || undefined;

    const events = await getCalendarEvents(
      session.accessToken as string,
      session.refreshToken as string,
      timeMin,
      timeMax
    );

    return NextResponse.json({ events });
  } catch (error: any) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch calendar events' },
      { status: 500 }
    );
  }
}
