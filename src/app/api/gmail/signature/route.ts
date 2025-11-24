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

    const gmail = await getGmailClient(session.accessToken, session.refreshToken);

    // Get Gmail settings to retrieve signature
    const settings = await gmail.users.settings.sendAs.list({
      userId: 'me',
    });

    const primaryEmail = settings.data.sendAs?.find((s: any) => s.isPrimary);
    
    if (!primaryEmail?.signature) {
      return NextResponse.json({ signature: '' });
    }

    return NextResponse.json({ signature: primaryEmail.signature });
  } catch (error) {
    console.error('Error fetching Gmail signature:', error);
    return NextResponse.json(
      { error: 'Failed to fetch signature' },
      { status: 500 }
    );
  }
}
