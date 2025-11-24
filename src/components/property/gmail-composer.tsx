'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { X, Minimize2, Maximize2, Trash2, Paperclip, Send, MoreVertical, FileText, Image as ImageIcon, Bold, Italic, Underline, Link2 } from 'lucide-react';

interface GmailComposerProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId?: string;
  contactId?: string;
  defaultTo?: string;
  defaultSubject?: string;
  defaultBody?: string;
  onSuccess?: () => void;
}

interface Contact {
  name: string;
  email: string;
  organization?: string;
}

export default function GmailComposer({
  isOpen,
  onClose,
  propertyId,
  contactId,
  defaultTo = '',
  defaultSubject = '',
  defaultBody = '',
  onSuccess,
}: GmailComposerProps) {
  const { data: session } = useSession();
  const [to, setTo] = useState(defaultTo);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState(defaultSubject);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [showFormatting, setShowFormatting] = useState(false);
  const [showContactSuggestions, setShowContactSuggestions] = useState(false);
  const [contactFilter, setContactFilter] = useState('');
  const [showAI, setShowAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);

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

  // Fetch Google Contacts
  const { data: googleContacts = [] } = useQuery<Contact[]>({
    queryKey: ['gmail-contacts'],
    queryFn: async () => {
      const res = await fetch('/api/gmail/contacts');
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isOpen && !!session?.accessToken,
    retry: false,
  });

  // Fetch Gmail templates (drafts)
  const { data: templates = [], isLoading: templatesLoading, error: templatesError } = useQuery({
    queryKey: ['gmail-templates'],
    queryFn: async () => {
      const res = await fetch('/api/gmail/templates');
      if (!res.ok) {
        console.error('Templates API error:', res.status, await res.text());
        return [];
      }
      const data = await res.json();
      console.log('Templates loaded:', data);
      return data;
    },
    enabled: isOpen && !!session?.accessToken,
    retry: false,
  });

  // Fetch property data for property contacts
  const { data: propertyData } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: async () => {
      const res = await fetch(`/api/properties/${propertyId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isOpen && !!propertyId,
  });

  // Combine all contacts
  const allContacts: Contact[] = [
    ...googleContacts,
    ...(propertyData?.propertyManager ? [{
      name: `${propertyData.propertyManager.firstName} ${propertyData.propertyManager.lastName}`,
      email: propertyData.propertyManager.email,
      organization: 'Property Manager'
    }] : []),
    ...(propertyData?.email ? [{
      name: propertyData.name || 'Property',
      email: propertyData.email,
      organization: 'Property'
    }] : []),
  ].filter(c => c.email);

  // Filter contacts based on input
  const filteredContacts = contactFilter.trim()
    ? allContacts.filter(c => 
        (c.name?.toLowerCase() || '').includes(contactFilter.toLowerCase()) ||
        (c.email?.toLowerCase() || '').includes(contactFilter.toLowerCase())
      ).slice(0, 5)
    : [];

  useEffect(() => {
    if (isOpen) {
      setTo(defaultTo);
      setSubject(defaultSubject);
      setCc('');
      setBcc('');
      setAttachments([]);
      setShowCc(false);
      setShowBcc(false);
      setIsMinimized(false);
      
      if (bodyRef.current) {
        if (defaultBody) {
          bodyRef.current.innerHTML = defaultBody + (signatureData?.signature ? '<br><br>' + signatureData.signature : '');
        } else if (signatureData?.signature && !bodyRef.current.innerHTML) {
          bodyRef.current.innerHTML = '<br><br>' + signatureData.signature;
        }
      }
    }
  }, [isOpen, defaultTo, defaultSubject, defaultBody, signatureData]);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments([...attachments, ...Array.from(e.target.files)]);
    }
  };

  const handleFormat = (command: string) => {
    document.execCommand(command, false);
    bodyRef.current?.focus();
  };

  const handleContactSelect = (contact: Contact) => {
    setTo(contact.email);
    setShowContactSuggestions(false);
    setContactFilter('');
  };

  const handleTemplateSelect = (template: any) => {
    setSubject(template.subject || '');
    if (bodyRef.current) {
      bodyRef.current.innerHTML = template.body || '';
      if (signatureData?.signature) {
        bodyRef.current.innerHTML += '<br><br>' + signatureData.signature;
      }
    }
    setShowTemplates(false);
  };

  const handleToChange = (value: string) => {
    setTo(value);
    setContactFilter(value);
    setShowContactSuggestions(value.length > 0);
  };

  const generateAIEmail = async () => {
    if (!aiPrompt.trim()) return;
    
    setGeneratingAI(true);
    try {
      console.log('Generating AI email with prompt:', aiPrompt);
      
      const res = await fetch('/api/ai/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt, context: subject }),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('AI API error:', res.status, errorText);
        throw new Error(`Failed to generate: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('AI generated content:', data);
      
      if (bodyRef.current && data.content) {
        bodyRef.current.innerHTML = data.content + (signatureData?.signature ? '<br><br>' + signatureData.signature : '');
      }
      
      setShowAI(false);
      setAiPrompt('');
    } catch (error: any) {
      console.error('AI generation error:', error);
      alert(`Failed to generate email: ${error.message}. Check console for details.`);
    } finally {
      setGeneratingAI(false);
    }
  };

  const openDrivePicker = async () => {
    try {
      console.log('Opening Drive picker with token:', session?.accessToken ? 'present' : 'missing');
      
      const response = await fetch('https://www.googleapis.com/drive/v3/files?pageSize=50&fields=files(id,name,mimeType,webViewLink,iconLink)&orderBy=modifiedTime desc', {
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Drive API error:', response.status, errorText);
        alert(`Failed to access Google Drive: ${response.status}. Check console for details.`);
        return;
      }
      
      const data = await response.json();
      console.log('Drive files:', data.files?.length || 0);
      const files = data.files || [];
      
      if (files.length === 0) {
        alert('No files found in your Google Drive');
        return;
      }
      
      // Show file selection
      const fileList = files.map((f: any, i: number) => `${i + 1}. ${f.name} (${f.mimeType.split('/').pop()})`).join('\n');
      const selection = prompt(`Enter file number to attach (1-${files.length}):\n\n${fileList}`);
      
      if (selection) {
        const index = parseInt(selection) - 1;
        if (index >= 0 && index < files.length) {
          const file = files[index];
          console.log('Selected file:', file.name);
          // Add to Drive files array for display
          setDriveFiles([...driveFiles, {
            id: file.id,
            name: file.name,
            link: file.webViewLink,
            mimeType: file.mimeType
          }]);
        }
      }
    } catch (error) {
      console.error('Drive error:', error);
      alert('Failed to access Google Drive. Check console for details.');
    }
  };

  const handleSend = async () => {
    if (!to || !subject) {
      alert('Please fill in recipient and subject');
      return;
    }

    // Add Drive file links to body
    let emailBody = bodyRef.current?.innerHTML || '';
    if (driveFiles.length > 0) {
      emailBody += '<br><br><strong>Attached from Google Drive:</strong><br>';
      driveFiles.forEach(file => {
        emailBody += `<a href="${file.link}" target="_blank" style="color: #03C066;">${file.name}</a><br>`;
      });
    }

    setSending(true);
    try {
      const scheduledFor = (scheduleDate && scheduleTime) ? `${scheduleDate}T${scheduleTime}` : undefined;
      
      const response = await fetch('/api/gmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          cc: cc || undefined,
          bcc: bcc || undefined,
          subject,
          body: emailBody,
          propertyId: propertyId || undefined,
          contactId: contactId || undefined,
          scheduledFor,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send');
      }

      const data = await response.json();
      alert(scheduledFor ? `Email scheduled for ${new Date(scheduledFor).toLocaleString()}` : 'Email sent successfully!');
      
      onSuccess?.();
      onClose();
      
      // Reset
      setTo(defaultTo);
      setSubject('');
      setCc('');
      setBcc('');
      setScheduleDate('');
      setScheduleTime('');
      setDriveFiles([]);
      if (bodyRef.current) bodyRef.current.innerHTML = '';
      setAttachments([]);
    } catch (error: any) {
      console.error('Error:', error);
      alert(error.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-0 right-6 w-[500px] bg-white shadow-2xl rounded-t-lg z-50 border border-gray-300">
        <div className="flex items-center justify-between px-4 py-3 bg-[#03C066] text-white rounded-t-lg cursor-pointer" onClick={() => setIsMinimized(false)}>
          <span className="text-sm font-medium truncate flex-1">{subject || 'New Message'}</span>
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="hover:bg-[#02a055] p-1 rounded">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 right-6 w-[650px] bg-white shadow-2xl rounded-t-lg z-50 flex flex-col max-h-[calc(100vh-80px)] border border-gray-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#03C066] text-white rounded-t-lg">
        <span className="text-sm font-medium">New Message</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setIsMinimized(true)} className="hover:bg-[#02a055] p-1.5 rounded transition" title="Minimize">
            <Minimize2 className="h-4 w-4" />
          </button>
          <button onClick={onClose} className="hover:bg-[#02a055] p-1.5 rounded transition" title="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Recipients */}
      <div className="border-b border-gray-200 relative">
        <div className="flex items-center px-4 py-2.5 hover:bg-gray-50">
          <span className="text-gray-600 text-sm w-14 font-medium">To</span>
          <input
            ref={toInputRef}
            type="text"
            value={to}
            onChange={(e) => handleToChange(e.target.value)}
            onFocus={() => {
              console.log('All contacts:', allContacts.length);
              if (to.trim()) {
                setShowContactSuggestions(true);
              }
            }}
            onBlur={() => setTimeout(() => setShowContactSuggestions(false), 200)}
            className="flex-1 outline-none text-sm bg-transparent"
            placeholder="Recipients (start typing or click Contacts)"
          />
          <button 
            onClick={() => {
              setContactFilter('');
              setShowContactSuggestions(!showContactSuggestions);
            }} 
            className="text-xs text-gray-600 hover:text-[#03C066] mr-3 font-medium transition"
          >
            Contacts ({allContacts.length})
          </button>
          <button onClick={() => setShowCc(!showCc)} className="text-xs text-gray-600 hover:text-[#03C066] mr-3 font-medium transition">
            Cc
          </button>
          <button onClick={() => setShowBcc(!showBcc)} className="text-xs text-gray-600 hover:text-[#03C066] font-medium transition">
            Bcc
          </button>
        </div>

        {/* Contact Suggestions */}
        {showContactSuggestions && (
          <div className="absolute top-full left-14 right-4 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
            {(contactFilter ? filteredContacts : allContacts).length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-600">No contacts found</div>
            ) : (
              (contactFilter ? filteredContacts : allContacts).map((contact, idx) => (
              <div
                key={idx}
                onClick={() => handleContactSelect(contact)}
                className="px-4 py-2.5 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
              >
                <div className="font-medium text-sm text-gray-900">{contact.name}</div>
                <div className="text-xs text-gray-600">{contact.email}</div>
                {contact.organization && (
                  <div className="text-xs text-gray-500 mt-0.5">{contact.organization}</div>
                )}
              </div>
              ))
            )}
          </div>
        )}
        
        {showCc && (
          <div className="flex items-center px-4 py-2.5 border-t border-gray-200 hover:bg-gray-50">
            <span className="text-gray-600 text-sm w-14 font-medium">Cc</span>
            <input
              type="text"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              className="flex-1 outline-none text-sm bg-transparent"
              placeholder="Cc"
            />
          </div>
        )}
        
        {showBcc && (
          <div className="flex items-center px-4 py-2.5 border-t border-gray-200 hover:bg-gray-50">
            <span className="text-gray-600 text-sm w-14 font-medium">Bcc</span>
            <input
              type="text"
              value={bcc}
              onChange={(e) => setBcc(e.target.value)}
              className="flex-1 outline-none text-sm bg-transparent"
              placeholder="Bcc"
            />
          </div>
        )}
      </div>

      {/* Subject */}
      <div className="flex items-center px-4 py-2.5 border-b border-gray-200 hover:bg-gray-50">
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="flex-1 outline-none text-sm bg-transparent"
          placeholder="Subject"
        />
      </div>

      {/* Formatting Toolbar */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-1">
            <button onClick={() => handleFormat('bold')} className="p-1.5 hover:bg-gray-200 rounded transition" title="Bold">
              <Bold className="h-4 w-4 text-gray-700" />
            </button>
            <button onClick={() => handleFormat('italic')} className="p-1.5 hover:bg-gray-200 rounded transition" title="Italic">
              <Italic className="h-4 w-4 text-gray-700" />
            </button>
            <button onClick={() => handleFormat('underline')} className="p-1.5 hover:bg-gray-200 rounded transition" title="Underline">
              <Underline className="h-4 w-4 text-gray-700" />
            </button>
            <div className="w-px h-5 bg-gray-300 mx-1" />
            <button onClick={() => fileInputRef.current?.click()} className="p-1.5 hover:bg-gray-200 rounded transition" title="Attach file">
              <Paperclip className="h-4 w-4 text-gray-700" />
            </button>
          <button onClick={openDrivePicker} className="p-1.5 hover:bg-gray-200 rounded transition" title="Google Drive">
            <ImageIcon className="h-4 w-4 text-gray-700" />
          </button>
          <button 
            onClick={() => setShowTemplates(!showTemplates)} 
            className="p-1.5 hover:bg-gray-200 rounded transition" 
            title="Templates"
          >
            <FileText className="h-4 w-4 text-gray-700" />
          </button>
          </div>
          
          <button 
            onClick={() => setShowAI(!showAI)} 
            className="flex items-center gap-2 px-3 py-1.5 bg-[#03C066] text-white rounded-md hover:bg-[#02a055] transition text-xs font-medium"
            title="Generate with AI"
          >
            <FileText className="h-3.5 w-3.5" />
            AI Generate
          </button>
        </div>
      </div>

      {/* Templates Dropdown */}
      {showTemplates && (
        <div className="border-b border-gray-200 bg-white max-h-48 overflow-y-auto">
          {templatesLoading ? (
            <div className="px-4 py-3 text-sm text-gray-600">Loading templates...</div>
          ) : templates.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-600">
              No templates found. Create drafts in Gmail to use as templates.
            </div>
          ) : (
            templates.map((template: any, idx: number) => (
              <div
                key={idx}
                onClick={() => handleTemplateSelect(template)}
                className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
              >
                <div className="font-medium text-sm text-gray-900">{template.subject}</div>
                <div className="text-xs text-gray-600 mt-1 truncate">{template.preview}</div>
              </div>
            ))
          )}
        </div>
      )}

      {/* AI Generation Panel */}
      {showAI && (
        <div className="border-b border-gray-200 bg-blue-50 px-4 py-3">
          <div className="flex gap-2 items-start">
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && generateAIEmail()}
              placeholder="Describe the email you want to generate..."
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md outline-none focus:border-[#03C066]"
            />
            <button
              onClick={generateAIEmail}
              disabled={generatingAI || !aiPrompt.trim()}
              className="px-4 py-2 bg-[#03C066] text-white rounded-md hover:bg-[#02a055] disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium whitespace-nowrap"
            >
              {generatingAI ? 'Generating...' : 'Generate'}
            </button>
          </div>
          <div className="text-xs text-gray-600 mt-2">
            Tip: Be specific about tone and key points you want to include
          </div>
        </div>
      )}

      {/* Body */}
      <div
        ref={bodyRef}
        contentEditable
        className="flex-1 px-4 py-3 outline-none text-sm overflow-y-auto min-h-[200px] max-h-[300px]"
        style={{ fontFamily: 'Arial, sans-serif' }}
        suppressContentEditableWarning
        spellCheck
      />

      {/* Attachments & Drive Files */}
      {(attachments.length > 0 || driveFiles.length > 0) && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex flex-wrap gap-2">
          {attachments.map((file, i) => (
            <div key={`file-${i}`} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md text-xs hover:border-[#03C066] transition">
              <Paperclip className="h-3.5 w-3.5 text-gray-600" />
              <span className="font-medium text-gray-900">{file.name}</span>
              <span className="text-gray-500">({Math.round(file.size / 1024)}KB)</span>
              <button 
                onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}
                className="ml-1 hover:text-red-600 transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {driveFiles.map((file, i) => (
            <div key={`drive-${i}`} className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-300 rounded-md text-xs hover:border-[#03C066] transition">
              <ImageIcon className="h-3.5 w-3.5 text-blue-600" />
              <span className="font-medium text-gray-900">{file.name}</span>
              <span className="text-blue-600 text-xs">Drive</span>
              <button 
                onClick={() => setDriveFiles(driveFiles.filter((_, idx) => idx !== i))}
                className="ml-1 hover:text-red-600 transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Schedule Send */}
      {showSchedule && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex gap-3 items-center">
          <span className="text-sm font-medium text-gray-700">Schedule for:</span>
          <input
            type="date"
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md"
            min={new Date().toISOString().split('T')[0]}
          />
          <input
            type="time"
            value={scheduleTime}
            onChange={(e) => setScheduleTime(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md"
          />
          <button 
            onClick={() => {
              setShowSchedule(false);
              setScheduleDate('');
              setScheduleTime('');
            }}
            className="text-sm text-gray-600 hover:text-red-600"
          >
            Clear
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
        <div className="flex items-center gap-2">
          <button
            onClick={handleSend}
            disabled={sending || !to || !subject}
            className="bg-[#03C066] hover:bg-[#02a055] text-white px-8 py-2.5 rounded-md text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
          >
            {sending ? (scheduleDate ? 'Scheduling...' : 'Sending...') : (scheduleDate ? 'Schedule Send' : 'Send')}
          </button>
          <button
            onClick={() => setShowSchedule(!showSchedule)}
            className="text-xs px-3 py-2 text-gray-600 hover:text-[#03C066] hover:bg-gray-100 rounded-md transition"
            title="Schedule send"
          >
            {showSchedule ? 'Send Now' : 'Schedule'}
          </button>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded transition" title="Delete draft">
          <Trash2 className="h-4 w-4 text-gray-600" />
        </button>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
