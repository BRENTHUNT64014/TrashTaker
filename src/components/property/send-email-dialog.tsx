'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { X, Minimize2, Maximize2, Trash2, Paperclip, Image, Link2, Smile, MoreVertical } from 'lucide-react';

interface SendEmailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  defaultTo?: string;
  onSuccess?: () => void;
}

export default function SendEmailDialog({
  isOpen,
  onClose,
  propertyId,
  defaultTo = '',
  onSuccess,
}: SendEmailDialogProps) {
  const { data: session } = useSession();
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [sending, setSending] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [showCcDropdown, setShowCcDropdown] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Fetch Gmail signature
  const { data: signatureData } = useQuery({
    queryKey: ['gmail-signature'],
    queryFn: async () => {
      const res = await fetch('/api/gmail/signature');
      if (!res.ok) return { signature: '' };
      return res.json();
    },
    enabled: isOpen && !!session?.accessToken,
    retry: false,
  });





  useEffect(() => {
    if (isOpen && defaultTo) {
      setTo(defaultTo);
    }
    if (isOpen && signatureData?.signature && bodyRef.current && !bodyRef.current.innerHTML.includes(signatureData.signature)) {
      bodyRef.current.innerHTML = '<br><br>' + signatureData.signature;
    }
  }, [isOpen, defaultTo, signatureData]);

  if (!isOpen) return null;

  const handleGenerateWithAI = async () => {
    if (!aiPrompt.trim()) return;
    
    setGeneratingAI(true);
    try {
      const response = await fetch('/api/ai/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: aiPrompt,
          context: { subject, currentBody: body }
        }),
      });

      if (!response.ok) throw new Error('Failed to generate email');
      
      const data = await response.json();
      setBody(data.content);
      setAiPrompt('');
    } catch (error) {
      console.error('Error generating email:', error);
      alert('Failed to generate email with AI');
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleLoadTemplate = (template: any) => {
    setSubject(template.subject || '');
    setBody(template.body || '');
    setShowTemplates(false);
  };

  const handleFormatText = (format: string) => {
    const textarea = editorRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = body.substring(start, end);

    let formattedText = '';
    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        break;
      case 'underline':
        formattedText = `<u>${selectedText}</u>`;
        break;
    }

    const newBody = body.substring(0, start) + formattedText + body.substring(end);
    setBody(newBody);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments([...attachments, ...Array.from(e.target.files)]);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleRemoveDriveAttachment = (index: number) => {
    setDriveAttachments(driveAttachments.filter((_, i) => i !== index));
  };

  const handleGoogleDrivePicker = () => {
    // Load Google Picker API
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      (window as any).gapi.load('picker', () => {
        const picker = new (window as any).google.picker.PickerBuilder()
          .addView((window as any).google.picker.ViewId.DOCS)
          .setOAuthToken(session?.accessToken)
          .setDeveloperKey(process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '')
          .setCallback((data: any) => {
            if (data.action === (window as any).google.picker.Action.PICKED) {
              const files = data.docs.map((doc: any) => ({
                id: doc.id,
                name: doc.name,
                url: doc.url,
                mimeType: doc.mimeType,
              }));
              setDriveAttachments([...driveAttachments, ...files]);
            }
          })
          .build();
        picker.setVisible(true);
      });
    };
    document.body.appendChild(script);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session?.accessToken) {
      alert('Please connect your Google account to send emails');
      return;
    }

    setSending(true);
    try {
      const formData = new FormData();
      formData.append('to', to);
      formData.append('subject', subject);
      formData.append('body', body);
      formData.append('propertyId', propertyId);
      if (cc) formData.append('cc', cc);
      if (bcc) formData.append('bcc', bcc);
      if (scheduleDate && scheduleTime) {
        formData.append('scheduledFor', `${scheduleDate}T${scheduleTime}`);
      }
      attachments.forEach((file) => {
        formData.append('attachments', file);
      });

      const response = await fetch('/api/gmail/send', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      const message = scheduleDate ? 'Email scheduled successfully!' : 'Email sent successfully!';
      alert(message);
      onSuccess?.();
      onClose();
      
      // Reset form
      setTo(defaultTo);
      setSubject('');
      setBody('');
      setCc('');
      setBcc('');
      setAttachments([]);
      setDriveAttachments([]);
      setScheduleDate('');
      setScheduleTime('');
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleInsertSignature = () => {
    if (signatureData?.signature) {
      const cursorPos = editorRef.current?.selectionStart || body.length;
      const newBody = body.slice(0, cursorPos) + '\n\n' + signatureData.signature + body.slice(cursorPos);
      setBody(newBody);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full mx-4 max-h-[95vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Compose Email</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowTemplates(!showTemplates)}
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="Load Template"
            >
              <FileText className="h-5 w-5 text-gray-600" />
            </button>
            <button
              type="button"
              onClick={() => setShowSchedule(!showSchedule)}
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="Schedule Send"
            >
              <Calendar className="h-5 w-5 text-gray-600" />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <span className="text-xl text-gray-500">✕</span>
            </button>
          </div>
        </div>

        {/* Google Access Warning */}
        {!hasGoogleAccess && (
          <div className="px-6 py-3 bg-yellow-50 border-b border-yellow-200">
            <div className="flex items-start gap-3">
              <span className="text-yellow-600 text-xl">⚠️</span>
              <div className="flex-1">
                <div className="text-sm font-medium text-yellow-900 mb-1">
                  Gmail Templates & Google Contacts Unavailable
                </div>
                <div className="text-xs text-yellow-700 mb-2">
                  To use Gmail templates and access your Google contacts, you need to reconnect your Google account with updated permissions.
                </div>
                <button
                  type="button"
                  onClick={() => window.location.href = '/api/auth/signin?callbackUrl=' + window.location.pathname}
                  className="text-xs bg-yellow-600 text-white px-3 py-1.5 rounded hover:bg-yellow-700 font-medium"
                >
                  Reconnect Google Account
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Templates Dropdown */}
        {showTemplates && (
          <div className="px-6 py-3 bg-blue-50 border-b">
            <div className="text-sm font-medium text-gray-700 mb-2">Gmail Templates (Drafts):</div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {templatesError ? (
                <div className="bg-red-50 border border-red-200 rounded p-3 text-sm">
                  <div className="text-red-800 font-medium mb-1">⚠️ Cannot access Gmail</div>
                  <div className="text-red-600 text-xs mb-2">
                    You need to reconnect your Google account to access templates and contacts.
                  </div>
                  <button
                    type="button"
                    onClick={() => window.location.href = '/api/auth/signin?callbackUrl=' + window.location.pathname}
                    className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                  >
                    Reconnect Google Account
                  </button>
                </div>
              ) : templates.length > 0 ? (
                templates.map((template: any, index: number) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleLoadTemplate(template)}
                    className="w-full text-left px-3 py-2 bg-white hover:bg-gray-50 rounded border text-sm"
                  >
                    <div className="font-medium">{template.subject}</div>
                    <div className="text-xs text-gray-500 truncate">{template.preview}</div>
                  </button>
                ))
              ) : (
                <div className="text-sm text-gray-500 text-center py-2">
                  No Gmail drafts found. Create drafts in Gmail to use as templates.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Schedule Send */}
        {showSchedule && (
          <div className="px-6 py-3 bg-green-50 border-b">
            <div className="text-sm font-medium text-gray-700 mb-2">Schedule Send:</div>
            <div className="flex gap-3">
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
                min={new Date().toISOString().split('T')[0]}
              />
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  setScheduleDate('');
                  setScheduleTime('');
                  setShowSchedule(false);
                }}
                className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 space-y-3">
            {/* To Field with Autocomplete */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setShowToDropdown(true);
                }}
                onFocus={() => setShowToDropdown(true)}
                onBlur={() => setTimeout(() => setShowToDropdown(false), 200)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03C066] focus:border-transparent"
                placeholder="Type name or email..."
              />
              {showToDropdown && filteredContacts.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredContacts.slice(0, 15).map((contact: any, index: number) => (
                    <button
                      key={contact._id || contact.id || index}
                      type="button"
                      onClick={() => {
                        setTo(contact.email);
                        setShowToDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b last:border-b-0 flex items-center gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm flex items-center gap-2">
                          {contact.fullName || `${contact.firstName || ''} ${contact.lastName || ''}`.trim()}
                          {contact.source === 'property' && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Property</span>
                          )}
                          {contact.source === 'google' && (
                            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Google</span>
                          )}
                          {contact.source === 'crm' && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">CRM</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 truncate">{contact.email}</div>
                        {contact.company && (
                          <div className="text-xs text-gray-400 truncate">{contact.company}</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cc Field with Autocomplete */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Cc</label>
              <input
                type="text"
                value={cc}
                onChange={(e) => {
                  setCc(e.target.value);
                  setShowCcDropdown(true);
                }}
                onFocus={() => setShowCcDropdown(true)}
                onBlur={() => setTimeout(() => setShowCcDropdown(false), 200)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03C066] focus:border-transparent"
                placeholder="Optional"
              />
              {showCcDropdown && filteredCcContacts.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredCcContacts.slice(0, 15).map((contact: any, index: number) => (
                    <button
                      key={contact._id || contact.id || index}
                      type="button"
                      onClick={() => {
                        setCc(contact.email);
                        setShowCcDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b last:border-b-0 flex items-center gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm flex items-center gap-2">
                          {contact.fullName || `${contact.firstName || ''} ${contact.lastName || ''}`.trim()}
                          {contact.source === 'property' && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Property</span>
                          )}
                          {contact.source === 'google' && (
                            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Google</span>
                          )}
                          {contact.source === 'crm' && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">CRM</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 truncate">{contact.email}</div>
                        {contact.company && (
                          <div className="text-xs text-gray-400 truncate">{contact.company}</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03C066] focus:border-transparent"
                placeholder="Email subject"
              />
            </div>

            {/* AI Compose Helper */}
            <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">AI Assistant</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Tell AI what you want to write... (e.g., 'Write a follow-up about our meeting')"
                  className="flex-1 px-3 py-2 border border-purple-200 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleGenerateWithAI())}
                />
                <button
                  type="button"
                  onClick={handleGenerateWithAI}
                  disabled={!aiPrompt.trim() || generatingAI}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
                >
                  {generatingAI ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </div>

            {/* Formatting Toolbar */}
            <div className="flex items-center gap-1 p-2 bg-gray-50 rounded-lg border">
              <button
                type="button"
                onClick={() => handleFormatText('bold')}
                className="p-2 hover:bg-gray-200 rounded"
                title="Bold"
              >
                <Bold className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleFormatText('italic')}
                className="p-2 hover:bg-gray-200 rounded"
                title="Italic"
              >
                <Italic className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleFormatText('underline')}
                className="p-2 hover:bg-gray-200 rounded"
                title="Underline"
              >
                <Underline className="h-4 w-4" />
              </button>
              <div className="w-px h-6 bg-gray-300 mx-2" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 hover:bg-gray-200 rounded flex items-center gap-1"
                title="Attach files from computer"
              >
                <Paperclip className="h-4 w-4" />
                <span className="text-xs">{attachments.length > 0 ? `(${attachments.length})` : ''}</span>
              </button>
              <button
                type="button"
                onClick={handleGoogleDrivePicker}
                className="p-2 hover:bg-gray-200 rounded flex items-center gap-1"
                title="Attach from Google Drive"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.01 1.485c-.358 0-.705.138-.976.407L2.48 10.597a1.375 1.375 0 0 0 0 1.946l8.553 8.706c.277.28.628.42.979.42.35 0 .701-.14.978-.42l8.553-8.706a1.375 1.375 0 0 0 0-1.946L13.99 1.892a1.378 1.378 0 0 0-.979-.407zm-.022 2.755 7.578 7.706-7.578 7.705-7.578-7.705 7.578-7.706z"/>
                </svg>
                <span className="text-xs">{driveAttachments.length > 0 ? `(${driveAttachments.length})` : ''}</span>
              </button>
              <div className="w-px h-6 bg-gray-300 mx-2" />
              <button
                type="button"
                onClick={handleInsertSignature}
                disabled={!signatureData?.signature}
                className="p-2 hover:bg-gray-200 rounded disabled:opacity-50"
                title="Insert signature"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 17L10 3L13 10L20 7L17 20L10 17L3 17Z" />
                </svg>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Attachments Display */}
            {(attachments.length > 0 || driveAttachments.length > 0) && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-sm">
                    <Paperclip className="h-3 w-3 text-blue-600" />
                    <span className="text-blue-900">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(index)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {driveAttachments.map((file, index) => (
                  <div key={`drive-${index}`} className="flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-200 rounded-full text-sm">
                    <svg className="h-3 w-3 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.01 1.485c-.358 0-.705.138-.976.407L2.48 10.597a1.375 1.375 0 0 0 0 1.946l8.553 8.706c.277.28.628.42.979.42.35 0 .701-.14.978-.42l8.553-8.706a1.375 1.375 0 0 0 0-1.946L13.99 1.892a1.378 1.378 0 0 0-.979-.407zm-.022 2.755 7.578 7.706-7.578 7.705-7.578-7.705 7.578-7.706z"/>
                    </svg>
                    <span className="text-green-900">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDriveAttachment(index)}
                      className="text-green-600 hover:text-green-800"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Message Body */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                ref={editorRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                rows={14}
                spellCheck={true}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03C066] focus:border-transparent font-sans resize-y"
                placeholder="Compose your email..."
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {scheduleDate && scheduleTime && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Scheduled for {new Date(`${scheduleDate}T${scheduleTime}`).toLocaleString()}
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium"
              disabled={sending}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={sending}
              className="px-6 py-2 bg-[#03C066] text-white rounded-lg hover:bg-[#02a055] disabled:opacity-50 font-medium flex items-center gap-2"
            >
              {sending ? 'Sending...' : scheduleDate ? 'Schedule Send' : 'Send Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
