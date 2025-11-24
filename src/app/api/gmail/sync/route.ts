import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getRecentEmails, parseEmailHeaders, extractEmailBody } from '@/lib/gmail';
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

    const { propertyId, contactId } = await request.json();
    const userEmail = session.user?.email || '';

    if (!propertyId && !contactId) {
      return NextResponse.json(
        { error: 'Missing propertyId or contactId' },
        { status: 400 }
      );
    }

    await dbConnect();

    let targetEmails: string[] = [];
    let existingMessageIds = new Set<string>();
    let targetType: 'property' | 'contact';
    let targetId: string;

    if (contactId) {
      // Handle contact sync
      const contact = await Contact.findById(contactId);
      if (!contact) {
        return NextResponse.json(
          { error: 'Contact not found' },
          { status: 404 }
        );
      }

      if (!contact.email) {
        return NextResponse.json(
          { error: 'No email address found for this contact' },
          { status: 400 }
        );
      }

      targetEmails = [contact.email];
      existingMessageIds = new Set(
        contact.communications?.map((c: any) => c.messageId).filter(Boolean) || []
      );
      targetType = 'contact';
      targetId = contactId;
    } else {
      // Handle property sync
      const property = await Property.findById(propertyId)
        .populate('propertyManager')
        .populate('regionalManager');
      if (!property) {
        return NextResponse.json(
          { error: 'Property not found' },
          { status: 404 }
        );
      }

      targetEmails = [
        property.email,
        property.officeEmail,
        property.propertyManager?.email,
        property.regionalManager?.email,
      ].filter(Boolean);

      if (targetEmails.length === 0) {
        return NextResponse.json(
          { error: 'No email addresses found for this property' },
          { status: 400 }
        );
      }

      existingMessageIds = new Set(
        property.communications?.map((c: any) => c.messageId).filter(Boolean) || []
      );
      targetType = 'property';
      targetId = propertyId;
    }

    // Search for emails to/from target contacts (last 30 days)
    const query = `{${targetEmails.map(e => `from:${e} OR to:${e}`).join(' OR ')}} newer_than:30d`;
    const messages = await getRecentEmails(
      session.accessToken,
      session.refreshToken,
      query,
      50
    );

    console.log(`Found ${messages.length} messages for ${targetType} with emails:`, targetEmails);

    let newCommunications = 0;

    for (const message of messages) {
      const messageId = message.id;
      
      // Skip if we already have this message
      if (existingMessageIds.has(messageId)) {
        continue;
      }

      const headers = parseEmailHeaders(message);
      const body = extractEmailBody(message);
      
      // Determine direction based on authenticated user's email
      // If the email is FROM the authenticated user, it's sent
      // If the email is TO the authenticated user, it's received
      const isFromUser = headers.from.toLowerCase().includes(userEmail.toLowerCase());
      const direction = isFromUser ? 'sent' : 'received';
      
      // For the email field, store the OTHER party's email address
      // For sent emails, store who we sent TO
      // For received emails, store who sent it (FROM)
      const otherPartyEmail = isFromUser ? headers.to : headers.from;
      
      const communicationData = {
        subject: headers.subject,
        email: otherPartyEmail,
        body: body,
        direction,
        date: new Date(headers.date),
        messageId: messageId,
      };

      // Add to contact or property communications
      if (targetType === 'contact') {
        await Contact.findByIdAndUpdate(targetId, {
          $push: { communications: communicationData },
        });
      } else {
        // Add to property only (not to individual contacts to avoid duplicates)
        await Property.findByIdAndUpdate(targetId, {
          $push: { communications: communicationData },
        });
      }

      newCommunications++;
      console.log(`Synced: ${headers.subject} (${direction})`);
    }

    return NextResponse.json({ 
      success: true, 
      newCommunications,
      totalChecked: messages.length,
    });
  } catch (error) {
    console.error('Error syncing emails:', error);
    return NextResponse.json(
      { error: 'Failed to sync emails' },
      { status: 500 }
    );
  }
}
