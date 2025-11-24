import { google } from 'googleapis';

export async function getGmailClient(accessToken: string, refreshToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

export async function sendEmail(
  accessToken: string,
  refreshToken: string,
  to: string,
  subject: string,
  body: string,
  cc?: string,
  bcc?: string
) {
  const gmail = await getGmailClient(accessToken, refreshToken);

  // Create email content
  const emailLines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
  ];

  if (cc) emailLines.push(`Cc: ${cc}`);
  if (bcc) emailLines.push(`Bcc: ${bcc}`);

  emailLines.push('', body);

  const email = emailLines.join('\r\n');
  const encodedEmail = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedEmail,
    },
  });

  return response.data;
}

export async function getRecentEmails(
  accessToken: string,
  refreshToken: string,
  query?: string,
  maxResults: number = 50
) {
  const gmail = await getGmailClient(accessToken, refreshToken);

  const response = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults,
  });

  if (!response.data.messages) {
    return [];
  }

  // Get full message details
  const messages = await Promise.all(
    response.data.messages.map(async (message) => {
      const details = await gmail.users.messages.get({
        userId: 'me',
        id: message.id!,
        format: 'full',
      });
      return details.data;
    })
  );

  return messages;
}

export function parseEmailHeaders(message: any) {
  const headers = message.payload?.headers || [];
  
  const getHeader = (name: string) => {
    const header = headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase());
    return header?.value || '';
  };

  return {
    from: getHeader('From'),
    to: getHeader('To'),
    subject: getHeader('Subject'),
    date: getHeader('Date'),
    messageId: getHeader('Message-ID'),
  };
}

export function extractEmailBody(message: any): string {
  if (!message.payload) return '';

  // Function to decode base64url
  const decodeBase64 = (data: string) => {
    try {
      return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
    } catch (e) {
      return '';
    }
  };

  // Check if message has parts (multipart)
  if (message.payload.parts) {
    // Look for text/html first, then text/plain
    const htmlPart = message.payload.parts.find((part: any) => part.mimeType === 'text/html');
    if (htmlPart?.body?.data) {
      return decodeBase64(htmlPart.body.data);
    }

    const textPart = message.payload.parts.find((part: any) => part.mimeType === 'text/plain');
    if (textPart?.body?.data) {
      const text = decodeBase64(textPart.body.data);
      return text.replace(/\n/g, '<br>');
    }
  }

  // Single part message
  if (message.payload.body?.data) {
    const body = decodeBase64(message.payload.body.data);
    if (message.payload.mimeType === 'text/plain') {
      return body.replace(/\n/g, '<br>');
    }
    return body;
  }

  return '';
}
