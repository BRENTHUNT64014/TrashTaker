import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import clientPromise from '@/lib/mongodb-client';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Delete all Google OAuth tokens for this user
    await db.collection('accounts').deleteMany({
      userId: session.user.id,
      provider: 'google',
    });

    return NextResponse.json({ 
      success: true,
      message: 'Google account disconnected. Please sign in again to grant new permissions.'
    });
  } catch (error) {
    console.error('Error disconnecting Google:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Google account' },
      { status: 500 }
    );
  }
}
