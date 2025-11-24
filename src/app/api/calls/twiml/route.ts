import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

/**
 * TwiML endpoint that handles call flow
 * 1. User answers their phone
 * 2. Play message to user
 * 3. Dial the contact
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const to = searchParams.get('to');

  if (!to) {
    return new NextResponse('Missing phone number', { status: 400 });
  }

  const VoiceResponse = twilio.twiml.VoiceResponse;
  const response = new VoiceResponse();

  // Say something to the user who answered
  response.say(
    { voice: 'alice', language: 'en-US' },
    'Please wait while we connect your call.'
  );

  // Dial the contact
  const dial = response.dial({
    callerId: process.env.TWILIO_PHONE_NUMBER,
    record: 'record-from-answer',
    recordingStatusCallback: `${process.env.NEXTAUTH_URL}/api/calls/recording`,
  });
  
  dial.number(to);

  // If contact doesn't answer
  response.say(
    { voice: 'alice', language: 'en-US' },
    'The contact did not answer. Goodbye.'
  );

  return new NextResponse(response.toString(), {
    headers: {
      'Content-Type': 'text/xml',
    },
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
