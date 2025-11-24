import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Contact from '@/models/Contact';
import Communication from '@/models/Communication';
import { sendSMS } from '@/lib/twilio';
import { CommunicationType } from '@/types/enums';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { contactId, phone, message } = await request.json();

    console.log('📱 SMS Send Request:', {
      contactId,
      phone,
      messageLength: message?.length,
      userId: session.user.id,
      userName: session.user.name
    });

    if (!phone || !message) {
      return NextResponse.json({ error: 'Phone number and message are required' }, { status: 400 });
    }

    if (message.trim().length === 0) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    // Send SMS via Twilio (formatting is handled in sendSMS function)
    console.log('🚀 Initiating Twilio SMS send...');
    const result = await sendSMS(phone, message);

    console.log('💾 Saving SMS to database...');

    // Get the formatted phone number from the result metadata
    // Find the contact to get their phone
    let savedPhone = phone;
    if (contactId) {
      const contact = await Contact.findById(contactId);
      if (contact?.phone) {
        savedPhone = contact.phone;
      }
    }

    // Save to Communication model
    const communication = await Communication.create({
      type: CommunicationType.SMS,
      from: session.user.id,
      to: savedPhone,
      message,
      status: result.status,
      metadata: {
        sid: result.sid,
        numSegments: result.numSegments,
        price: result.price,
        twilioStatus: result.status,
      },
      contact: contactId || undefined,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year retention
    });

    console.log('✅ Communication record created:', communication._id);

    // Also save to contact's communications array if contactId provided
    if (contactId) {
      await Contact.findByIdAndUpdate(contactId, {
        $push: {
          communications: {
            subject: 'SMS Message',
            email: savedPhone,
            body: message,
            direction: 'sent',
            date: new Date(),
            messageId: result.sid,
          },
        },
      });
      console.log('✅ SMS added to contact communications');
    }

    console.log('🎉 SMS sent successfully!', {
      sid: result.sid,
      status: result.status,
      numSegments: result.numSegments,
      to: savedPhone
    });

    return NextResponse.json({
      success: true,
      sid: result.sid,
      status: result.status,
      numSegments: result.numSegments,
      price: result.price,
      communication: communication._id,
      message: 'SMS sent successfully'
    });
  } catch (error) {
    console.error('Error sending SMS:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send SMS' },
      { status: 500 }
    );
  }
}

// Get SMS history
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contactId');

    const filter: any = { type: CommunicationType.SMS };
    if (contactId) {
      filter.contact = contactId;
    }

    const messages = await Communication.find(filter)
      .populate('from', 'name email')
      .populate('contact', 'firstName lastName phone')
      .sort({ createdAt: -1 })
      .limit(100);

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching SMS history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SMS history' },
      { status: 500 }
    );
  }
}
