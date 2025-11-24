'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MessageSquare } from 'lucide-react';

interface SendSmsDialogProps {
  open: boolean;
  onClose: () => void;
  contactId?: string;
  contactName?: string;
  defaultPhone?: string;
  onSuccess?: () => void;
}

export default function SendSmsDialog({
  open,
  onClose,
  contactId,
  contactName,
  defaultPhone,
  onSuccess,
}: SendSmsDialogProps) {
  const [phone, setPhone] = useState(defaultPhone || '');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [charCount, setCharCount] = useState(0);

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setMessage(text);
    setCharCount(text.length);
  };

  const handleSend = async () => {
    if (!phone || !message) {
      alert('Please enter a phone number and message');
      return;
    }

    // Validate phone number - must be 10+ digits
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      alert('❌ Invalid Phone Number\n\nPlease enter a valid phone number with at least 10 digits.\n\nExamples:\n• (816) 409-8803\n• 816-409-8803\n• 8164098803\n• +1 816-409-8803');
      return;
    }

    if (cleanPhone.length > 15) {
      alert('❌ Invalid Phone Number\n\nPhone number is too long. Maximum 15 digits allowed.');
      return;
    }

    if (message.trim().length === 0) {
      alert('Please enter a message');
      return;
    }

    if (message.length > 1600) {
      alert('❌ Message Too Long\n\nMaximum 1600 characters allowed.\nCurrent: ' + message.length);
      return;
    }

    setSending(true);
    try {
      console.log('📱 Sending SMS:', { 
        phone, 
        cleanPhone,
        phoneLength: cleanPhone.length,
        messageLength: message.length 
      });

      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId,
          phone,
          message,
        }),
      });

      const data = await res.json();
      console.log('✅ SMS API Response:', data);

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send SMS');
      }

      const segments = data.numSegments || 1;
      const cost = data.price || 'Unknown';

      alert(
        `✅ SMS Sent Successfully!\n\n` +
        `To: ${formatPhoneDisplay(phone)}\n` +
        `Message ID: ${data.sid}\n` +
        `Status: ${data.status}\n` +
        `Segments: ${segments} message${segments > 1 ? 's' : ''}\n` +
        (cost !== 'Unknown' ? `Cost: ${cost}\n` : '') +
        `\n✓ Message delivered to Twilio\n` +
        `✓ Logged in contact history`
      );
      
      setMessage('');
      setCharCount(0);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('❌ Error sending SMS:', error);
      
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      alert(
        `❌ Failed to Send SMS\n\n` +
        `Error: ${errorMsg}\n\n` +
        `Troubleshooting:\n` +
        `• Verify phone number is correct (${cleanPhone.length} digits found)\n` +
        `• Check number is in E.164 format: +[country][number]\n` +
        `• Ensure recipient can receive SMS\n` +
        `• Verify device has signal and is powered on\n` +
        `• Check Twilio account balance\n` +
        `• Confirm number is not blocked/unsubscribed`
      );
    } finally {
      setSending(false);
    }
  };

  const formatPhoneDisplay = (phoneNumber: string) => {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phoneNumber;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Send SMS Message
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {contactName && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm font-medium text-blue-900">
                Sending to: {contactName}
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
              disabled={!!defaultPhone}
            />
            {phone && (
              <div className="mt-1 space-y-1">
                <p className="text-xs text-muted-foreground">
                  Will send to: {formatPhoneDisplay(phone)}
                </p>
                {(() => {
                  const digits = phone.replace(/\D/g, '');
                  if (digits.length < 10) {
                    return <p className="text-xs text-red-600">❌ Too short ({digits.length} digits, need 10+)</p>;
                  } else if (digits.length > 15) {
                    return <p className="text-xs text-red-600">❌ Too long ({digits.length} digits, max 15)</p>;
                  } else {
                    return <p className="text-xs text-green-600">✓ Valid ({digits.length} digits)</p>;
                  }
                })()}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="message">Message</Label>
              <span className={`text-xs ${charCount > 160 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                {charCount} / {charCount > 160 ? Math.ceil(charCount / 160) + ' messages' : '160'}
              </span>
            </div>
            <Textarea
              id="message"
              value={message}
              onChange={handleMessageChange}
              placeholder="Type your message here..."
              rows={6}
              className="resize-none"
            />
            {charCount > 160 && (
              <p className="text-xs text-orange-600 mt-1">
                ⚠️ Message exceeds 160 characters and will be sent as {Math.ceil(charCount / 160)} separate messages
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <svg className="h-4 w-4 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
            </svg>
            <span className="text-xs text-gray-700">
              This message will be sent via Twilio and logged in the contact's communication history
            </span>
          </div>

          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <span className="text-xs text-blue-700 font-medium">
              Real SMS will be sent from: +1 (816) 476-4790
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || !phone || !message}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {sending ? 'Sending via Twilio...' : 'Send SMS'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
