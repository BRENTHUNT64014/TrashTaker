'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function ForceReconnectPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleDisconnectGoogle = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/auth/disconnect-google', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage('✅ Google disconnected! Signing you out now...');
        setTimeout(() => {
          signOut({ callbackUrl: '/auth/signin' });
        }, 2000);
      } else {
        setMessage('❌ Error: ' + data.error);
      }
    } catch (error) {
      setMessage('❌ Failed to disconnect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-4">Force Google Reconnection</h1>
        
        <div className="mb-6 text-sm text-gray-600">
          <p className="mb-2">This will:</p>
          <ol className="list-decimal ml-5 space-y-1">
            <li>Delete your Google OAuth tokens from the database</li>
            <li>Sign you out</li>
            <li>You'll need to sign in with Google again</li>
            <li>Google will ask for the new permissions</li>
          </ol>
        </div>

        {session?.accessToken && (
          <div className="mb-4 p-3 bg-blue-50 rounded text-sm">
            <div className="font-medium">Current Session:</div>
            <div className="text-xs text-gray-600 mt-1">
              Email: {session.user?.email}
            </div>
            <div className="text-xs text-gray-600">
              Has Token: Yes
            </div>
          </div>
        )}

        {message && (
          <div className={`mb-4 p-3 rounded text-sm ${
            message.startsWith('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message}
          </div>
        )}

        <button
          onClick={handleDisconnectGoogle}
          disabled={loading}
          className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
        >
          {loading ? 'Disconnecting...' : 'Disconnect Google & Sign Out'}
        </button>

        <button
          onClick={() => router.push('/dashboard')}
          className="w-full mt-3 border border-gray-300 py-2 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
