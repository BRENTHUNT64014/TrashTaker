import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sendSMS } from '@/lib/twilio';

/**
 * Test endpoint to verify Twilio SMS functionality
 * POST /api/sms/test
 * Body: { phone: string, message?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { phone, message } = await request.json();

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const testMessage = message || `Test SMS from Trash Tasker - Sent at ${new Date().toLocaleString()}`;

    console.log('🧪 TEST SMS:', { 
      originalPhone: phone, 
      messageLength: testMessage.length 
    });

    // Check Twilio credentials
    const hasCreds = !!(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER
    );

    if (!hasCreds) {
      return NextResponse.json({
        error: 'Twilio credentials not configured',
        details: {
          TWILIO_ACCOUNT_SID: !!process.env.TWILIO_ACCOUNT_SID,
          TWILIO_AUTH_TOKEN: !!process.env.TWILIO_AUTH_TOKEN,
          TWILIO_PHONE_NUMBER: !!process.env.TWILIO_PHONE_NUMBER,
        }
      }, { status: 500 });
    }

    // Send test SMS (validation happens in sendSMS)
    const result = await sendSMS(phone, testMessage);

    return NextResponse.json({
      success: true,
      message: 'Test SMS sent successfully',
      details: {
        sid: result.sid,
        status: result.status,
        numSegments: result.numSegments,
        price: result.price,
        to: phone,
        from: process.env.TWILIO_PHONE_NUMBER,
        messageLength: testMessage.length,
        sentAt: new Date().toISOString(),
      }
    });

  } catch (error: any) {
    console.error('Test SMS Error:', error);
    return NextResponse.json({
      error: 'Failed to send test SMS',
      message: error.message,
      code: error.code,
      status: error.status,
      moreInfo: error.moreInfo,
    }, { status: 500 });
  }
}
