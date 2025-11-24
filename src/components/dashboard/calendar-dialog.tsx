'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CreateEventDialog } from '@/components/calendar/create-event-dialog';

interface CalendarDialogProps {
  open: boolean;
  onClose: () => void;
}

type ViewMode = 'day' | 'week' | 'month';

export function CalendarDialog({ open, onClose }: CalendarDialogProps) {
  const { data: session } = useSession();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [createEventOpen, setCreateEventOpen] = useState(false);

  useEffect(() => {
    if (open && session?.accessToken) {
      loadEvents();
    }
  }, [open, currentDate, session?.accessToken]);

  const loadEvents = async () => {
    if (!session?.accessToken) return;
    
    setLoadingEvents(true);
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const res = await fetch(
        `/api/calendar/list?timeMin=${startOfMonth.toISOString()}&timeMax=${endOfMonth.toISOString()}`
      );
      
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoadingEvents(false);
    }
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek };
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const getEventsForDay = (day: number) => {
    return events.filter((event) => {
      const eventDate = new Date(event.start?.dateTime || event.start?.date);
      return (
        eventDate.getDate() === day &&
        eventDate.getMonth() === currentDate.getMonth() &&
        eventDate.getFullYear() === currentDate.getFullYear()
      );
    });
  };

  const renderMonthView = () => {
    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
    const days = [];
    
    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-20 border border-gray-200 bg-gray-50" />);
    }
    
    // Actual days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = 
        day === new Date().getDate() &&
        currentDate.getMonth() === new Date().getMonth() &&
        currentDate.getFullYear() === new Date().getFullYear();
      
      const dayEvents = getEventsForDay(day);
      
      days.push(
        <div
          key={day}
          className={cn(
            'h-20 border border-gray-200 p-2 hover:bg-gray-50 cursor-pointer',
            isToday && 'bg-[#03C066]/10'
          )}
        >
          <div className={cn(
            'text-sm font-medium',
            isToday && 'text-[#03C066] font-bold'
          )}>
            {day}
          </div>
          {dayEvents.length > 0 && (
            <div className="mt-1 space-y-1">
              {dayEvents.slice(0, 2).map((event, i) => (
                <div
                  key={i}
                  className="text-xs bg-blue-100 text-blue-700 px-1 py-0.5 rounded truncate"
                  title={event.summary}
                >
                  {event.summary}
                </div>
              ))}
              {dayEvents.length > 2 && (
                <div className="text-xs text-gray-500">
                  +{dayEvents.length - 2} more
                </div>
              )}
            </div>
          )}
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-7 gap-0 border-l border-t">
        {dayNames.map((name) => (
          <div
            key={name}
            className="text-center text-sm font-semibold py-2 bg-gray-100 border-b border-r"
          >
            {name}
          </div>
        ))}
        {days}
      </div>
    );
  };

  const renderWeekView = () => {
    return (
      <div className="text-center py-12 text-gray-500">
        <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Week view - Coming soon</p>
      </div>
    );
  };

  const renderDayView = () => {
    return (
      <div className="text-center py-12 text-gray-500">
        <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Day view - Coming soon</p>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Calendar</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigateMonth('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="text-lg font-semibold min-w-[200px] text-center">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigateMonth('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {/* View mode selector */}
              <div className="flex gap-1 border rounded-md p-1">
                <button
                  onClick={() => setViewMode('day')}
                  className={cn(
                    'px-3 py-1 text-xs rounded transition-colors',
                    viewMode === 'day'
                      ? 'bg-[#03C066] text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  Day
                </button>
                <button
                  onClick={() => setViewMode('week')}
                  className={cn(
                    'px-3 py-1 text-xs rounded transition-colors',
                    viewMode === 'week'
                      ? 'bg-[#03C066] text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  Week
                </button>
                <button
                  onClick={() => setViewMode('month')}
                  className={cn(
                    'px-3 py-1 text-xs rounded transition-colors',
                    viewMode === 'month'
                      ? 'bg-[#03C066] text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  Month
                </button>
              </div>

              <Button 
                size="sm" 
                className="bg-[#03C066] hover:bg-[#02a055]"
                onClick={() => setCreateEventOpen(true)}
                disabled={!session?.accessToken}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                New Event
              </Button>
            </div>
          </div>

          {/* Calendar view */}
          <div className="min-h-[500px]">
            {!session?.accessToken ? (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium mb-2">Google Calendar Not Connected</p>
                <p className="text-sm">Sign in with Google to view and manage your calendar</p>
              </div>
            ) : loadingEvents ? (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50 animate-pulse" />
                <p>Loading events...</p>
              </div>
            ) : (
              <>
                {viewMode === 'month' && renderMonthView()}
                {viewMode === 'week' && renderWeekView()}
                {viewMode === 'day' && renderDayView()}
              </>
            )}
          </div>
        </div>
      </DialogContent>

      <CreateEventDialog
        open={createEventOpen}
        onClose={() => setCreateEventOpen(false)}
        onSuccess={() => {
          setCreateEventOpen(false);
          loadEvents();
        }}
      />
    </Dialog>
  );
}
