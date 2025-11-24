import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Contact from '@/models/Contact';
import Communication from '@/models/Communication';
import { CommunicationType } from '@/types/enums';
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { contactId, phone, userPhone } = await request.json();

    console.log('📞 Call Request:', {
      contactId,
      phone,
      userPhone,
      userId: session.user.id,
      userName: session.user.name
    });

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    if (!userPhone) {
      return NextResponse.json({ error: 'Your phone number is required to receive the call' }, { status: 400 });
    }

    if (!accountSid || !authToken || !twilioPhoneNumber) {
      throw new Error('Twilio credentials are not configured');
    }

    // Format phone numbers
    const formattedContactPhone = phone.startsWith('+') ? phone : `+1${phone.replace(/\D/g, '')}`;
    const formattedUserPhone = userPhone.startsWith('+') ? userPhone : `+1${userPhone.replace(/\D/g, '')}`;

    console.log('📱 Formatted numbers:', {
      contact: formattedContactPhone,
      user: formattedUserPhone,
      twilio: twilioPhoneNumber
    });

    const client = twilio(accountSid, authToken);

    console.log('🔵 Initiating Twilio call...');

    // Create TwiML response inline
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();
    
    // Greet the user
    response.say(
      { voice: 'alice', language: 'en-US' },
      'Please wait while we connect your call.'
    );
    
    // Dial the contact with recording
    const dial = response.dial({
      callerId: twilioPhoneNumber,
      record: 'record-from-answer',
    });
    dial.number(formattedContactPhone);
    
    // If contact doesn't answer
    response.say(
      { voice: 'alice', language: 'en-US' },
      'The contact did not answer. Goodbye.'
    );

    const twiml = response.toString();
    console.log('📝 Generated TwiML:', twiml);

    // Make the call - calls user first with inline TwiML
    const call = await client.calls.create({
      twiml: twiml,
      to: formattedUserPhone,
      from: twilioPhoneNumber,
    });

    console.log('✅ Call initiated:', {
      sid: call.sid,
      status: call.status,
      to: call.to,
      from: call.from,
    });

    // Save to Communication model
    const communication = await Communication.create({
      type: CommunicationType.CALL,
      from: session.user.id,
      to: formattedContactPhone,
      message: `Outbound call to ${formattedContactPhone}`,
      status: call.status,
      metadata: {
        callSid: call.sid,
        userPhone: formattedUserPhone,
        contactPhone: formattedContactPhone,
        direction: 'outbound',
      },
      contact: contactId || undefined,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year retention
    });

    console.log('💾 Communication record created:', communication._id);

    // Also save to contact's communications array if contactId provided
    if (contactId) {
      await Contact.findByIdAndUpdate(contactId, {
        $push: {
          communications: {
            subject: 'Phone Call',
            email: formattedContactPhone,
            body: `Outbound call initiated at ${new Date().toLocaleString()}`,
            direction: 'sent',
            date: new Date(),
            messageId: call.sid,
          },
        },
      });
      console.log('✅ Call added to contact communications');
    }

    console.log('🎉 Call initiated successfully!', {
      callSid: call.sid,
      status: call.status,
    });

    return NextResponse.json({
      success: true,
      callSid: call.sid,
      status: call.status,
      communication: communication._id,
      message: 'Call initiated - You will receive a call first, then we will connect you to the contact',
    });
  } catch (error: any) {
    console.error('❌ Call Error:', {
      message: error.message,
      code: error.code,
      status: error.status,
      moreInfo: error.moreInfo
    });
    return NextResponse.json(
      { error: error.message || 'Failed to initiate call' },
      { status: 500 }
    );
  }
}

// Get call history
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contactId');

    const filter: any = { type: CommunicationType.CALL };
    if (contactId) {
      filter.contact = contactId;
    }

    const calls = await Communication.find(filter)
      .populate('from', 'name email')
      .populate('contact', 'firstName lastName phone')
      .sort({ createdAt: -1 })
      .limit(100);

    return NextResponse.json(calls);
  } catch (error) {
    console.error('Error fetching call history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch call history' },
      { status: 500 }
    );
  }
}
