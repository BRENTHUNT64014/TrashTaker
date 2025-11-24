import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

/**
 * Validates and formats a phone number to E.164 format
 * E.164: [+][country code][subscriber number including area code]
 * Example: +14155552671
 */
function validateAndFormatPhone(phone: string): { valid: boolean; formatted: string; error?: string } {
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // If it starts with +, keep it
  if (cleaned.startsWith('+')) {
    // Already has country code
    const digits = cleaned.substring(1);
    if (digits.length < 10 || digits.length > 15) {
      return { valid: false, formatted: cleaned, error: 'Phone number must be 10-15 digits after country code' };
    }
    return { valid: true, formatted: cleaned };
  }
  
  // If it starts with 1 (US/Canada country code)
  if (cleaned.startsWith('1') && cleaned.length === 11) {
    return { valid: true, formatted: `+${cleaned}` };
  }
  
  // If it's 10 digits, assume US/Canada (+1)
  if (cleaned.length === 10) {
    return { valid: true, formatted: `+1${cleaned}` };
  }
  
  // If it's 11 digits and doesn't start with 1, might be international
  if (cleaned.length === 11) {
    return { valid: true, formatted: `+${cleaned}` };
  }
  
  return { valid: false, formatted: cleaned, error: `Invalid phone number format. Got ${cleaned.length} digits, expected 10 (US) or 11 with country code` };
}

export async function sendSMS(to: string, message: string) {
  try {
    console.log('🔵 Sending SMS via Twilio:', {
      from: phoneNumber,
      to,
      messageLength: message.length,
      accountSid: accountSid?.substring(0, 10) + '...'
    });

    if (!accountSid || !authToken || !phoneNumber) {
      throw new Error('Twilio credentials are not configured. Check TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in .env');
    }

    // Validate and format the destination number
    const validation = validateAndFormatPhone(to);
    if (!validation.valid) {
      throw new Error(`Invalid phone number: ${validation.error}`);
    }
    
    const formattedTo = validation.formatted;
    console.log('📱 Phone validation:', {
      original: to,
      formatted: formattedTo,
      valid: validation.valid
    });

    // Validate message length (SMS limit is 1600 characters for concatenated messages)
    if (message.length === 0) {
      throw new Error('Message cannot be empty');
    }
    if (message.length > 1600) {
      throw new Error('Message too long. Maximum 1600 characters allowed');
    }

    const result = await client.messages.create({
      body: message,
      from: phoneNumber,
      to: formattedTo,
    });

    console.log('✅ SMS sent successfully:', {
      sid: result.sid,
      status: result.status,
      to: result.to,
      from: result.from,
      direction: result.direction,
      numSegments: result.numSegments,
      price: result.price,
      priceUnit: result.priceUnit,
      dateSent: result.dateSent,
      dateCreated: result.dateCreated
    });

    return {
      success: true,
      sid: result.sid,
      status: result.status,
      numSegments: result.numSegments,
      price: result.price,
    };
  } catch (error: any) {
    console.error('❌ Twilio SMS Error:', {
      message: error.message,
      code: error.code,
      status: error.status,
      moreInfo: error.moreInfo,
      details: error.details
    });
    
    // Provide helpful error messages
    let errorMessage = error.message;
    if (error.code === 21211) {
      errorMessage = 'Invalid phone number. Please check the number and try again.';
    } else if (error.code === 21408) {
      errorMessage = 'Permission denied to send SMS to this number. It may be blocked or unsubscribed.';
    } else if (error.code === 21610) {
      errorMessage = 'The number is not reachable or opted out of receiving SMS.';
    }
    
    throw new Error(`Failed to send SMS: ${errorMessage}`);
  }
}

export async function makeCall(to: string, twimlUrl: string) {
  try {
    const result = await client.calls.create({
      url: twimlUrl,
      from: phoneNumber,
      to,
    });

    return {
      success: true,
      sid: result.sid,
      status: result.status,
    };
  } catch (error: any) {
    console.error('Twilio Call Error:', error);
    throw new Error(`Failed to make call: ${error.message}`);
  }
}

export async function sendRouteStartNotification(
  districtManagerPhone: string,
  collectorName: string,
  propertyName: string
) {
  const message = `ALERT: ${collectorName} has not started their route at ${propertyName}. Please check in.`;
  return sendSMS(districtManagerPhone, message);
}

export async function sendTicketSLAAlert(districtManagerPhone: string, ticketNumber: string) {
  const message = `ALERT: Ticket ${ticketNumber} has not been acknowledged within 2 hours. Please respond immediately.`;
  return sendSMS(districtManagerPhone, message);
}
