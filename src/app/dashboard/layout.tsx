'use client';

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { DashboardNav } from '@/components/dashboard/nav';
import { useState } from 'react';
import { Menu, X, User, LogOut, Plus, Search, Calendar } from 'lucide-react';
import { useSession, signOut, signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { QuickCreateMenu } from '@/components/dashboard/quick-create-menu';
import { GlobalSearchDialog } from '@/components/dashboard/global-search-dialog';
import { CalendarDialog } from '@/components/dashboard/calendar-dialog';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const [headerVisible, setHeaderVisible] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (!session) {
    redirect('/auth/signin');
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Hover trigger area at top of screen */}
      <div 
        className="fixed top-0 left-0 right-0 h-8 z-40"
        onMouseEnter={() => setHeaderVisible(true)}
        onMouseLeave={() => setHeaderVisible(false)}
      />
      
      <header 
        className={`fixed top-0 left-0 right-0 z-50 w-full border-b bg-[#03C066] shadow-sm transition-transform duration-300 ${
          headerVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
        onMouseEnter={() => setHeaderVisible(true)}
        onMouseLeave={() => setHeaderVisible(false)}
      >
        <div className="flex h-12 items-center px-4 gap-4">
          <h1 className="text-base font-bold text-white whitespace-nowrap">Trash Tasker</h1>
          
          {/* Navigation */}
          <div className="flex-1">
            <DashboardNav userRole={session.user.role} onSignOut={() => signOut({ callbackUrl: '/' })} />
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Quick Create */}
            <QuickCreateMenu />
            
            {/* Global Search */}
            <button
              onClick={() => setSearchOpen(true)}
              className="p-1.5 rounded bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Search"
            >
              <Search className="h-4 w-4 text-white" />
            </button>
            
            {/* Calendar */}
            <button
              onClick={() => setCalendarOpen(true)}
              className="p-1.5 rounded bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Calendar"
            >
              <Calendar className="h-4 w-4 text-white" />
            </button>

            {/* Connect Google Calendar if not connected */}
            {!session?.accessToken && (
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  const googleEmail = prompt('Enter your Google email address:');
                  if (!googleEmail) return;
                  
                  const confirmLink = confirm(
                    `Link ${googleEmail} to your account? This will transfer Google Calendar access.`
                  );
                  
                  if (!confirmLink) return;
                  
                  try {
                    const res = await fetch('/api/auth/link-google', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ googleEmail }),
                    });
                    
                    const data = await res.json();
                    
                    if (res.ok) {
                      alert(data.message);
                      signOut({ callbackUrl: '/auth/signin' });
                    } else {
                      alert(data.error || 'Failed to link account');
                    }
                  } catch (error) {
                    alert('Error linking account. Please try again.');
                  }
                }}
                className="h-7 text-xs"
              >
                <Calendar className="h-3 w-3 mr-1" />
                Link Calendar
              </Button>
            )}
            
            {/* User info */}
            <div className="flex items-center gap-1.5 text-xs text-white ml-2">
              <User className="h-3 w-3" />
              <div>
                <div className="font-medium">{session.user.name}</div>
                <div className="text-[10px] text-white/80">{session.user.role}</div>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <GlobalSearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
      <CalendarDialog open={calendarOpen} onClose={() => setCalendarOpen(false)} />
      
      <main className="min-h-screen p-6 bg-gray-50 pt-6">{children}</main>
    </div>
  );
}
