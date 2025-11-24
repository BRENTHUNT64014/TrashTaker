import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { oldEmail, newEmail } = await request.json();

    if (!oldEmail || !newEmail) {
      return NextResponse.json({ error: 'Both emails required' }, { status: 400 });
    }

    // Delete any existing user with the new email (Google account)
    await User.deleteOne({ email: newEmail, password: { $exists: false } });

    const user = await User.findOne({ email: oldEmail });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    user.email = newEmail;
    await user.save();

    return NextResponse.json({ 
      success: true, 
      message: `Email updated from ${oldEmail} to ${newEmail}` 
    });
  } catch (error: any) {
    console.error('Error updating email:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update email' },
      { status: 500 }
    );
  }
}
