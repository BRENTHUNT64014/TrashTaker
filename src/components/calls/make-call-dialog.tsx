'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone } from 'lucide-react';

interface MakeCallDialogProps {
  open: boolean;
  onClose: () => void;
  contactId?: string;
  contactName?: string;
  contactPhone?: string;
  onSuccess?: () => void;
}

export default function MakeCallDialog({
  open,
  onClose,
  contactId,
  contactName,
  contactPhone,
  onSuccess,
}: MakeCallDialogProps) {
  const [userPhone, setUserPhone] = useState('');
  const [calling, setCalling] = useState(false);

  const handleCall = async () => {
    if (!userPhone || !contactPhone) {
      alert('Please enter your phone number');
      return;
    }

    // Basic phone validation
    const cleanPhone = userPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      alert('Please enter a valid phone number (at least 10 digits)');
      return;
    }

    setCalling(true);
    try {
      console.log('📞 Initiating call:', { userPhone, contactPhone });

      const res = await fetch('/api/calls/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId,
          phone: contactPhone,
          userPhone,
        }),
      });

      const data = await res.json();
      console.log('Call API Response:', data);

      if (!res.ok) {
        throw new Error(data.error || 'Failed to initiate call');
      }

      alert(
        `✅ Call Initiated!\n\n` +
        `You will receive a call at: ${formatPhoneDisplay(userPhone)}\n\n` +
        `When you answer, we will connect you to:\n` +
        `${contactName} - ${formatPhoneDisplay(contactPhone)}\n\n` +
        `Call ID: ${data.callSid}\n\n` +
        `The call will be recorded for quality assurance.`
      );

      setUserPhone('');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('❌ Error initiating call:', error);
      alert(
        `Failed to initiate call\n\n` +
        `${error instanceof Error ? error.message : 'Unknown error'}\n\n` +
        `Please check:\n` +
        `• Your Twilio credentials are configured\n` +
        `• Both phone numbers are valid\n` +
        `• Your Twilio account has sufficient balance`
      );
    } finally {
      setCalling(false);
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
            <Phone className="h-5 w-5" />
            Make Outbound Call
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {contactName && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="text-sm font-medium text-green-900">
                Calling: {contactName}
              </div>
              <div className="text-xs text-green-700 mt-1">
                {formatPhoneDisplay(contactPhone || '')}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <div className="text-2xl">📞</div>
                <div className="flex-1 text-sm text-blue-900">
                  <p className="font-semibold mb-2">How this works:</p>
                  <ol className="list-decimal list-inside space-y-1 text-blue-800">
                    <li>Enter your phone number below</li>
                    <li>You will receive a call on your phone</li>
                    <li>Answer the call</li>
                    <li>We will automatically connect you to the contact</li>
                    <li>The call will be recorded</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="userPhone">Your Phone Number *</Label>
            <Input
              id="userPhone"
              type="tel"
              value={userPhone}
              onChange={(e) => setUserPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
              autoFocus
            />
            {userPhone && (
              <p className="text-xs text-muted-foreground mt-1">
                You will receive a call at: {formatPhoneDisplay(userPhone)}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <svg className="h-4 w-4 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <span className="text-xs text-gray-700">
              Call will be logged in contact's communication history and recorded
            </span>
          </div>

          <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
            <svg className="h-4 w-4 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <span className="text-xs text-orange-700">
              This will use Twilio minutes and may incur charges
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={calling}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCall}
            disabled={calling || !userPhone || !contactPhone}
            className="bg-green-600 hover:bg-green-700"
          >
            <Phone className="h-4 w-4 mr-2" />
            {calling ? 'Initiating Call...' : 'Call Now'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
