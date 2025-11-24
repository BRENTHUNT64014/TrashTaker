import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getGmailClient } from '@/lib/gmail';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.accessToken || !session?.refreshToken) {
      return NextResponse.json(
        { error: 'Not authenticated with Google' },
        { status: 401 }
      );
    }

    const { google } = await import('googleapis');
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
    );

    oauth2Client.setCredentials({
      access_token: session.accessToken,
      refresh_token: session.refreshToken,
    });

    const people = google.people({ version: 'v1', auth: oauth2Client });

    // Fetch Google Contacts
    const response = await people.people.connections.list({
      resourceName: 'people/me',
      pageSize: 1000,
      personFields: 'names,emailAddresses,organizations',
    });

    const connections = response.data.connections || [];

    // Format contacts
    const googleContacts = connections
      .filter((person: any) => person.emailAddresses && person.emailAddresses.length > 0)
      .map((person: any) => {
        const name = person.names?.[0];
        const email = person.emailAddresses?.[0];
        const org = person.organizations?.[0];

        return {
          id: person.resourceName,
          firstName: name?.givenName || '',
          lastName: name?.familyName || '',
          fullName: name?.displayName || email?.value || 'Unknown',
          email: email?.value || '',
          company: org?.name || '',
          source: 'google',
        };
      })
      .filter((contact: any) => contact.email);

    return NextResponse.json(googleContacts);
  } catch (error) {
    console.error('Error fetching Google contacts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Google contacts' },
      { status: 500 }
    );
  }
}
