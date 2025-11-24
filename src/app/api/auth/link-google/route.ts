import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectDB from '@/lib/mongodb';
import { MongoClient } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { googleEmail } = await request.json();

    if (!googleEmail) {
      return NextResponse.json({ error: 'Google email required' }, { status: 400 });
    }

    await connectDB();
    
    const client = await MongoClient.connect(process.env.MONGODB_URI!);
    const db = client.db();

    // Find the Google account
    const googleUser = await db.collection('users').findOne({ email: googleEmail });
    
    if (!googleUser) {
      client.close();
      return NextResponse.json({ error: 'Google account not found' }, { status: 404 });
    }

    // Find the account entry for Google
    const googleAccount = await db.collection('accounts').findOne({ 
      userId: googleUser._id,
      provider: 'google'
    });

    if (!googleAccount) {
      client.close();
      return NextResponse.json({ error: 'Google account entry not found' }, { status: 404 });
    }

    // Update the account to point to current user
    await db.collection('accounts').updateOne(
      { _id: googleAccount._id },
      { $set: { userId: session.user.id } }
    );

    // Delete the temporary Google user
    await db.collection('users').deleteOne({ _id: googleUser._id });

    client.close();

    return NextResponse.json({ 
      success: true, 
      message: 'Google account linked successfully. Please sign out and sign in again.' 
    });
  } catch (error: any) {
    console.error('Error linking account:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to link account' },
      { status: 500 }
    );
  }
}
