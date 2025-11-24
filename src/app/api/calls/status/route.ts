import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Communication from '@/models/Communication';

/**
 * Webhook endpoint for Twilio call status updates
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const callSid = formData.get('CallSid') as string;
    const callStatus = formData.get('CallStatus') as string;
    const callDuration = formData.get('CallDuration') as string;
    const recordingUrl = formData.get('RecordingUrl') as string;

    console.log('📞 Call Status Update:', {
      callSid,
      callStatus,
      callDuration,
      recordingUrl,
    });

    await dbConnect();

    // Update the communication record
    const updateData: any = {
      status: callStatus,
      'metadata.callStatus': callStatus,
    };

    if (callDuration) {
      updateData['metadata.duration'] = parseInt(callDuration);
    }

    if (recordingUrl) {
      updateData['metadata.recordingUrl'] = recordingUrl;
    }

    await Communication.findOneAndUpdate(
      { 'metadata.callSid': callSid },
      { $set: updateData }
    );

    console.log('✅ Call status updated:', callSid, callStatus);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating call status:', error);
    return NextResponse.json({ error: 'Failed to update call status' }, { status: 500 });
  }
}
