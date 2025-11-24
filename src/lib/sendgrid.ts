import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: Array<{
    content: string;
    filename: string;
    type: string;
    disposition: string;
  }>;
}

export async function sendEmail(options: EmailOptions) {
  try {
    const msg = {
      to: options.to,
      from: process.env.SENDGRID_FROM_EMAIL!,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    };

    await sgMail.send(msg);

    return { success: true };
  } catch (error: any) {
    console.error('SendGrid Error:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

export async function sendViolationEmail(
  to: string,
  propertyName: string,
  unit: string,
  violationType: string,
  photos: string[],
  pdfAttachment?: string
) {
  const html = `
    <h2>Violation Notice</h2>
    <p><strong>Property:</strong> ${propertyName}</p>
    <p><strong>Unit:</strong> ${unit}</p>
    <p><strong>Violation Type:</strong> ${violationType}</p>
    <p>Please review the attached documentation for details.</p>
  `;

  const attachments = pdfAttachment
    ? [
        {
          content: pdfAttachment,
          filename: `violation-${unit}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment',
        },
      ]
    : undefined;

  return sendEmail({
    to,
    subject: `Violation Notice - Unit ${unit}`,
    html,
    attachments,
  });
}
