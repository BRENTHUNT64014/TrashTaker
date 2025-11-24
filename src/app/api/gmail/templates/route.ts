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

    // Search for draft messages (Gmail templates are typically saved as drafts)
    const response = await gmail.users.drafts.list({
      userId: 'me',
      maxResults: 50,
    });

    if (!response.data.drafts) {
      return NextResponse.json([]);
    }

    // Get full details of each draft
    const templates = await Promise.all(
      response.data.drafts.map(async (draft) => {
        const details = await gmail.users.drafts.get({
          userId: 'me',
          id: draft.id!,
          format: 'full',
        });

        const message = details.data.message;
        const headers = message?.payload?.headers || [];
        
        const getHeader = (name: string) => {
          const header = headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase());
          return header?.value || '';
        };

        // Get message body
        let body = '';
        if (message?.payload?.body?.data) {
          body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
        } else if (message?.payload?.parts) {
          const textPart = message.payload.parts.find((part: any) => part.mimeType === 'text/plain');
          if (textPart?.body?.data) {
            body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
          }
        }

        return {
          id: draft.id,
          subject: getHeader('Subject'),
          body: body,
          preview: body.substring(0, 100),
        };
      })
    );

    // Filter out templates without subjects (likely not real templates)
    const validTemplates = templates.filter(t => t.subject);

    return NextResponse.json(validTemplates);
  } catch (error) {
    console.error('Error fetching Gmail templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}
