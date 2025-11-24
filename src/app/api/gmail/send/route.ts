import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getGmailClient } from '@/lib/gmail';
import dbConnect from '@/lib/mongodb';
import Property from '@/models/Property';
import Contact from '@/models/Contact';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.accessToken || !session?.refreshToken) {
      return NextResponse.json(
        { error: 'Not authenticated with Google' },
        { status: 401 }
      );
    }

    const { to, subject, body, propertyId, contactId, cc, bcc, scheduledFor, attachments = [] } = await request.json();

    if (!to || !subject || !body) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, body' },
        { status: 400 }
      );
    }

    // If scheduled, save as draft and schedule it
    if (scheduledFor) {
      await dbConnect();
      
      // Store scheduled email in database (you'd need a ScheduledEmail model)
      // For now, we'll just return success with a note
      return NextResponse.json({ 
        success: true, 
        scheduled: true,
        scheduledFor,
        message: 'Email scheduling will be implemented with a cron job'
      });
    }

    const gmail = await getGmailClient(session.accessToken, session.refreshToken);

    // Build email with attachments
    const boundary = '----=_Part_' + Date.now();
    const emailLines = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ];

    if (cc) emailLines.push(`Cc: ${cc}`);
    if (bcc) emailLines.push(`Bcc: ${bcc}`);

    emailLines.push('', `--${boundary}`);
    emailLines.push('Content-Type: text/html; charset=utf-8');
    emailLines.push('Content-Transfer-Encoding: 7bit');
    emailLines.push('', body, '');

    // Add attachments (already base64 encoded from client)
    for (const attachment of attachments) {
      emailLines.push(`--${boundary}`);
      emailLines.push(`Content-Type: ${attachment.type || 'application/octet-stream'}; name="${attachment.name}"`);
      emailLines.push('Content-Transfer-Encoding: base64');
      emailLines.push(`Content-Disposition: attachment; filename="${attachment.name}"`);
      emailLines.push('', attachment.data, '');
    }

    emailLines.push(`--${boundary}--`);

    const email = emailLines.join('\r\n');
    const encodedEmail = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail,
      },
    });

    // Save communication to database
    await dbConnect();
    const communicationData = {
      subject,
      email: to,
      body: body,
      direction: 'sent',
      date: new Date(),
      messageId: response.data.id,
    };

    // If propertyId provided, log to property communications
    if (propertyId) {
      await Property.findByIdAndUpdate(propertyId, {
        $push: {
          communications: communicationData,
        },
      });
    }

    // If contactId provided, log to contact communications
    if (contactId) {
      console.log('Saving email to contact with ID:', contactId);
      const updateResult = await Contact.findByIdAndUpdate(contactId, {
        $push: {
          communications: communicationData,
        },
      });
      console.log('Contact update result:', updateResult ? 'Success' : 'Contact not found');
    } else {
      // If no contactId provided, try to find contact(s) by email and save to them
      const emailAddresses = to.split(',').map(e => e.trim().toLowerCase());
      console.log('No contactId provided, searching for contacts by email addresses:', emailAddresses);
      
      for (const emailAddr of emailAddresses) {
        // Extract email from format like "Name <email@example.com>" if present
        const emailMatch = emailAddr.match(/<(.+)>/) || [null, emailAddr];
        const cleanEmail = emailMatch[1];
        console.log('Searching for contacts with email:', cleanEmail);
        
        // Find all contacts with this email and update them
        const updateResult = await Contact.updateMany(
          { email: { $regex: new RegExp(`^${cleanEmail}$`, 'i') }, isActive: true },
          {
            $push: {
              communications: communicationData,
            },
          }
        );
        console.log(`Updated ${updateResult.modifiedCount} contacts with email ${cleanEmail}`);
      }
    }

    return NextResponse.json({ 
      success: true, 
      messageId: response.data.id 
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
