'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateEventDialog } from '@/components/calendar/create-event-dialog';

export function TodayCalendarWidget() {
  const { data: session } = useSession();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createEventOpen, setCreateEventOpen] = useState(false);

  useEffect(() => {
    if (session?.accessToken) {
      loadTodayEvents();
    } else {
      setLoading(false);
    }
  }, [session?.accessToken]);

  const loadTodayEvents = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const res = await fetch(
        `/api/calendar/list?timeMin=${today.toISOString()}&timeMax=${tomorrow.toISOString()}`
      );

      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  if (!session?.accessToken) {
    return (
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today's Calendar
          </CardTitle>
          <CardDescription>Your schedule for today</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-sm text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Connect Google Calendar to see your schedule</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today's Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-sm text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50 animate-pulse" />
            <p>Loading events...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="col-span-3">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Today's Calendar
              </CardTitle>
              <CardDescription>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</CardDescription>
            </div>
            <Button size="sm" onClick={() => setCreateEventOpen(true)}>
              + New Event
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No events scheduled for today</p>
              <Button 
                size="sm" 
                variant="outline" 
                className="mt-3"
                onClick={() => setCreateEventOpen(true)}
              >
                Schedule an event
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event, index) => {
                const startTime = event.start?.dateTime || event.start?.date;
                const endTime = event.end?.dateTime || event.end?.date;
                const hasConferenceData = event.conferenceData?.entryPoints?.length > 0;
                
                return (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex flex-col items-center min-w-[60px]">
                      <Clock className="h-4 w-4 text-muted-foreground mb-1" />
                      <div className="text-sm font-medium">{formatTime(startTime)}</div>
                      {endTime && (
                        <div className="text-xs text-muted-foreground">{formatTime(endTime)}</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{event.summary}</div>
                      {event.location && (
                        <div className="text-xs text-muted-foreground mt-1">
                          📍 {event.location}
                        </div>
                      )}
                      {event.description && (
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {event.description}
                        </div>
                      )}
                      {hasConferenceData && (
                        <a
                          href={event.conferenceData.entryPoints[0].uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-2"
                        >
                          <Video className="h-3 w-3" />
                          Join Google Meet
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateEventDialog
        open={createEventOpen}
        onClose={() => setCreateEventOpen(false)}
        onSuccess={() => {
          setCreateEventOpen(false);
          loadTodayEvents();
        }}
      />
    </>
  );
}
