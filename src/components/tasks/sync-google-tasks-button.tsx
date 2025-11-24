'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export default function SyncGoogleTasksButton() {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/tasks/sync', {
        method: 'POST',
      });

      if (!res.ok) {
        throw new Error('Failed to sync tasks');
      }

      const result = await res.json();
      
      alert(
        `✅ Sync Complete!\n\n` +
        `• ${result.imported} new tasks imported\n` +
        `• ${result.updated} tasks updated\n\n` +
        `Refresh the page to see changes.`
      );
      
      // Refresh the page to show updated tasks
      window.location.reload();
    } catch (error) {
      console.error('Error syncing tasks:', error);
      alert('Failed to sync tasks with Google. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Button 
      onClick={handleSync} 
      disabled={syncing}
      variant="outline"
      size="sm"
    >
      <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
      {syncing ? 'Syncing...' : 'Sync from Google Tasks'}
    </Button>
  );
}
