import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Communication from '@/models/Communication';

/**
 * Webhook endpoint for Twilio recording status updates
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const callSid = formData.get('CallSid') as string;
    const recordingSid = formData.get('RecordingSid') as string;
    const recordingUrl = formData.get('RecordingUrl') as string;
    const recordingDuration = formData.get('RecordingDuration') as string;

    console.log('🎙️ Recording Update:', {
      callSid,
      recordingSid,
      recordingUrl,
      recordingDuration,
    });

    await dbConnect();

    // Update the communication record with recording info
    await Communication.findOneAndUpdate(
      { 'metadata.callSid': callSid },
      {
        $set: {
          'metadata.recordingSid': recordingSid,
          'metadata.recordingUrl': recordingUrl,
          'metadata.recordingDuration': parseInt(recordingDuration || '0'),
        },
      }
    );

    console.log('✅ Recording info saved:', recordingSid);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving recording info:', error);
    return NextResponse.json({ error: 'Failed to save recording' }, { status: 500 });
  }
}
