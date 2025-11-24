'use client';

import { signOut, useSession } from 'next-auth/react';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { LogOut, User, Calendar } from 'lucide-react';

interface DashboardHeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string;
  };
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const { data: session } = useSession();
  const hasGoogleCalendar = !!session?.accessToken;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-6">
        <div className="flex flex-1 items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-primary">Trash Tasker</h1>
          </div>
          <div className="flex items-center gap-4">
            {!hasGoogleCalendar && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => signIn('google', { callbackUrl: window.location.href })}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Connect Google Calendar
              </Button>
            )}
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4" />
              <div>
                <div className="font-medium">{user.name}</div>
                <div className="text-xs text-muted-foreground">{user.role}</div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: '/' })}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
