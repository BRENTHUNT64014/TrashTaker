'use client';

import { use, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Mail, User, Building2, MapPin, Phone, Check, X, Briefcase, Calendar } from 'lucide-react';
import GmailComposer from '@/components/property/gmail-composer';
import MakeCallDialog from '@/components/calls/make-call-dialog';
import { useSession } from 'next-auth/react';

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [sendEmailDialogOpen, setSendEmailDialogOpen] = useState(false);
  const [makeCallDialogOpen, setMakeCallDialogOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<string>('');
  const [replySubject, setReplySubject] = useState<string>('');
  const [replyBody, setReplyBody] = useState<string>('');
  const [syncing, setSyncing] = useState(false);

  const { data: contact, isLoading } = useQuery({
    queryKey: ['contact', id],
    queryFn: async () => {
      const res = await fetch(`/api/contacts/${id}`);
      if (!res.ok) throw new Error('Failed to fetch contact');
      const data = await res.json();
      console.log('Contact data loaded:', {
        id: data._id,
        email: data.email,
        communicationsCount: data.communications?.length || 0,
        communications: data.communications
      });
      return data;
    },
  });

  const handleEditField = (field: string, currentValue: any) => {
    setEditingField(field);
    setEditValue(currentValue || '');
  };

  const handleSaveField = async (field: string) => {
    setIsSaving(true);
    try {
      const updateData: any = { [field]: editValue };

      const res = await fetch(`/api/contacts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) throw new Error('Failed to update contact');

      await queryClient.invalidateQueries({ queryKey: ['contact', id] });
      setEditingField(null);
      setEditValue('');
    } catch (error) {
      console.error('Error updating contact:', error);
      alert('Failed to update contact');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const handleSyncGmail = async () => {
    if (!contact?.email) {
      alert('No email address for this contact');
      return;
    }

    setSyncing(true);
    try {
      const res = await fetch(`/api/gmail/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: id }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to sync');
      }

      const data = await res.json();
      alert(`Synced ${data.syncedCount || 0} emails from Gmail`);
      
      // Refresh contact data
      await queryClient.invalidateQueries({ queryKey: ['contact', id] });
    } catch (error: any) {
      console.error('Sync error:', error);
      alert(`Failed to sync: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Contact not found</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/dashboard/crm')}
              className="hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <User className="h-6 w-6 text-gray-400" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {contact.firstName} {contact.lastName}
                  </h1>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                    {contact.title && (
                      <>
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {contact.title}
                        </span>
                        <span>•</span>
                      </>
                    )}
                    <span>Last Update: {new Date(contact.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {session?.accessToken && contact.email && (
              <Button
                onClick={handleSyncGmail}
                disabled={syncing}
                variant="outline"
                size="sm"
              >
                <Mail className="h-4 w-4 mr-2" />
                {syncing ? 'Syncing...' : 'Sync Gmail'}
              </Button>
            )}
            {contact.phone && (
              <Button
                onClick={() => setMakeCallDialogOpen(true)}
                variant="outline"
                size="sm"
                className="border-green-500 text-green-600 hover:bg-green-50"
              >
                <Phone className="h-4 w-4 mr-2" />
                Call
              </Button>
            )}
            <Button
              onClick={() => setSendEmailDialogOpen(true)}
              className="bg-[#03C066] hover:bg-[#02a855]"
              size="sm"
            >
              <Mail className="h-4 w-4 mr-2" />
              Send Email
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <Tabs defaultValue="overview" className="h-full">
          <div className="bg-white border-b px-6">
            <TabsList className="bg-transparent border-b-0">
              <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-[#03C066] data-[state=active]:text-[#03C066] rounded-none">Overview</TabsTrigger>
              <TabsTrigger value="email" className="data-[state=active]:border-b-2 data-[state=active]:border-[#03C066] data-[state=active]:text-[#03C066] rounded-none">Email</TabsTrigger>
              <TabsTrigger value="calls" className="data-[state=active]:border-b-2 data-[state=active]:border-[#03C066] data-[state=active]:text-[#03C066] rounded-none">Calls</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="p-4 space-y-4">
            {/* Key Information Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {contact.company && (
                <Card className="border-l-4 border-l-[#03C066]">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#03C066]/10 rounded-lg">
                        <Building2 className="h-5 w-5 text-[#03C066]" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 font-medium">Company</div>
                        <div 
                          className="text-sm font-semibold text-gray-900 mt-1 cursor-pointer hover:text-[#03C066]"
                          onClick={() => router.push(`/dashboard/crm/companies/${contact.company._id}`)}
                        >
                          {contact.company.name}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {contact.property && (
                <Card className="border-l-4 border-l-[#03C066]">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#03C066]/10 rounded-lg">
                        <MapPin className="h-5 w-5 text-[#03C066]" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 font-medium">Property</div>
                        <div 
                          className="text-sm font-semibold text-gray-900 mt-1 cursor-pointer hover:text-[#03C066]"
                          onClick={() => router.push(`/dashboard/crm/properties/${contact.property._id}`)}
                        >
                          {contact.property.name}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <User className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 font-medium">Status</div>
                      <div className="text-sm font-semibold text-gray-900 mt-1">
                        {contact.isActive ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {contact.lastVerified && (
                <Card className="border-l-4 border-l-yellow-500">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-500/10 rounded-lg">
                        <Calendar className="h-5 w-5 text-yellow-500" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 font-medium">Last Verified</div>
                        <div className="text-sm font-semibold text-gray-900 mt-1">
                          {new Date(contact.lastVerified).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {contact.isPrimary && (
                <Card className="border-l-4 border-l-purple-500">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500/10 rounded-lg">
                        <Briefcase className="h-5 w-5 text-purple-500" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 font-medium">Primary Contact</div>
                        <div className="text-sm font-semibold text-gray-900 mt-1">Yes</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader className="pb-4 border-b">
              <CardTitle className="text-lg font-bold text-gray-900">Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                {/* Left Column */}
                <div className="space-y-3">
                  {/* First Name */}
                  <div className="text-xs">
                    <span className="text-gray-600 font-medium">First Name:</span>
                    {editingField === 'firstName' ? (
                      <div className="flex items-center gap-1 mt-1">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-6 text-xs"
                          autoFocus
                        />
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleSaveField('firstName')} disabled={isSaving}>
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCancelEdit}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="font-semibold text-gray-900 mt-1 cursor-pointer hover:text-[#03C066]" onClick={() => handleEditField('firstName', contact.firstName)}>
                        {contact.firstName}
                      </div>
                    )}
                  </div>

                  {/* Last Name */}
                  <div className="text-xs">
                    <span className="text-gray-600 font-medium">Last Name:</span>
                    {editingField === 'lastName' ? (
                      <div className="flex items-center gap-1 mt-1">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-6 text-xs"
                          autoFocus
                        />
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleSaveField('lastName')} disabled={isSaving}>
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCancelEdit}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="font-semibold text-gray-900 mt-1 cursor-pointer hover:text-[#03C066]" onClick={() => handleEditField('lastName', contact.lastName)}>
                        {contact.lastName}
                      </div>
                    )}
                  </div>

                  {/* Email */}
                  <div className="text-xs">
                    <span className="text-gray-600 font-medium">Email:</span>
                    {editingField === 'email' ? (
                      <div className="flex items-center gap-1 mt-1">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-6 text-xs"
                          autoFocus
                        />
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleSaveField('email')} disabled={isSaving}>
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCancelEdit}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="font-semibold text-gray-900 mt-1 cursor-pointer hover:text-[#03C066]" onClick={() => handleEditField('email', contact.email)}>
                        {contact.email || '-'}
                      </div>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="text-xs">
                    <span className="text-gray-600 font-medium">Phone:</span>
                    {editingField === 'phone' ? (
                      <div className="flex items-center gap-1 mt-1">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-6 text-xs"
                          autoFocus
                        />
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleSaveField('phone')} disabled={isSaving}>
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCancelEdit}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="font-semibold text-gray-900 mt-1 cursor-pointer hover:text-[#03C066]" onClick={() => handleEditField('phone', contact.phone)}>
                        {contact.phone || '-'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-3">
                  {/* Title */}
                  <div className="text-xs">
                    <span className="text-gray-600 font-medium">Title:</span>
                    {editingField === 'title' ? (
                      <div className="flex items-center gap-1 mt-1">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-6 text-xs"
                          autoFocus
                        />
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleSaveField('title')} disabled={isSaving}>
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCancelEdit}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="font-semibold text-gray-900 mt-1 cursor-pointer hover:text-[#03C066]" onClick={() => handleEditField('title', contact.title)}>
                        {contact.title || '-'}
                      </div>
                    )}
                  </div>

                  {/* Company */}
                  <div className="text-xs">
                    <span className="text-gray-600 font-medium">Company:</span>
                    <div className="font-semibold text-gray-900 mt-1">
                      {contact.company?.name || '-'}
                    </div>
                  </div>

                  {/* Property */}
                  <div className="text-xs">
                    <span className="text-gray-600 font-medium">Property:</span>
                    <div className="font-semibold text-gray-900 mt-1">
                      {contact.property?.name || '-'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes - Full Width */}
              <div className="mt-6 text-xs">
                <span className="text-gray-600 font-medium">Notes:</span>
                {editingField === 'notes' ? (
                  <div className="mt-1">
                    <Textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="text-xs min-h-[100px]"
                      autoFocus
                    />
                    <div className="flex gap-1 mt-2">
                      <Button size="sm" onClick={() => handleSaveField('notes')} disabled={isSaving}>
                        <Check className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="font-semibold text-gray-900 mt-1 cursor-pointer hover:text-[#03C066] whitespace-pre-wrap"
                    onClick={() => handleEditField('notes', contact.notes)}
                  >
                    {contact.notes || 'Click to add notes...'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

              {/* Right Sidebar */}
              <div className="space-y-6">
                {/* Quick Actions */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {contact.email && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => setSendEmailDialogOpen(true)}
                        >
                          <Mail className="h-3.5 w-3.5 mr-2" />
                          Send Email
                        </Button>
                      )}
                      {contact.phone && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => window.location.href = `tel:${contact.phone}`}
                        >
                          <Phone className="h-3.5 w-3.5 mr-2" />
                          Call
                        </Button>
                      )}
                      {contact.property && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="w-full justify-start"
                          onClick={async () => {
                            if (confirm('Are you sure you want to remove this contact from the property?')) {
                              try {
                                const res = await fetch(`/api/contacts/${id}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ property: null }),
                                });
                                if (!res.ok) throw new Error('Failed to remove contact from property');
                                await queryClient.invalidateQueries({ queryKey: ['contact', id] });
                              } catch (error) {
                                console.error('Error removing contact from property:', error);
                                alert('Failed to remove contact from property');
                              }
                            }
                          }}
                        >
                          <X className="h-3.5 w-3.5 mr-2" />
                          Remove from Property
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="email" className="p-4 space-y-4">
            <Card>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold">
                    Email Communications ({contact.communications?.filter((c: any) => c.subject !== 'SMS Message' && c.subject !== 'Phone Call').length || 0})
                  </CardTitle>
                  {session?.accessToken && contact.email && (
                    <Button
                      onClick={handleSyncGmail}
                      disabled={syncing}
                      variant="outline"
                      size="sm"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      {syncing ? 'Syncing...' : 'Sync Gmail'}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {!contact.communications || contact.communications.filter((c: any) => c.subject !== 'SMS Message' && c.subject !== 'Phone Call').length === 0 ? (
                  <div className="text-center py-12">
                    <Mail className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-semibold">No email communications yet</h3>
                    <p className="text-muted-foreground mt-2">Send an email to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {contact.communications
                      .filter((c: any) => c.subject !== 'SMS Message' && c.subject !== 'Phone Call')
                      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((comm: any, idx: number) => (
                        <details key={idx} className="group border rounded-lg">
                          <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 list-none">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <span className={`px-2 py-1 text-xs font-medium rounded ${
                                  comm.direction === 'sent' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                }`}>
                                  {comm.direction === 'sent' ? 'Sent' : 'Received'}
                                </span>
                                <span className="font-medium text-gray-900">{comm.subject || 'No Subject'}</span>
                              </div>
                              <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                                <span>{comm.email}</span>
                                <span>•</span>
                                <span>{new Date(comm.date).toLocaleString()}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setReplyTo(comm.email);
                                  setReplySubject(comm.subject?.startsWith('Re:') ? comm.subject : `Re: ${comm.subject || 'Your message'}`);
                                  setReplyBody(comm.body ? `\n\n---\nOn ${new Date(comm.date).toLocaleString()}, ${comm.email} wrote:\n${comm.body}` : '');
                                  setSendEmailDialogOpen(true);
                                }}
                              >
                                Reply
                              </Button>
                              <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                            </div>
                          </summary>
                          <div className="p-4 border-t bg-gray-50 max-h-96 overflow-y-auto">
                            <div 
                              className="prose prose-sm max-w-none"
                              dangerouslySetInnerHTML={{ __html: comm.body || 'No content' }}
                            />
                          </div>
                        </details>
                      ))
                    }
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calls" className="p-4 space-y-4">
            <Card>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Phone Calls ({contact.communications?.filter((c: any) => c.subject === 'Phone Call').length || 0})
                  </CardTitle>
                  {contact.phone && (
                    <Button
                      onClick={() => setMakeCallDialogOpen(true)}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Make Call
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {!contact.phone ? (
                  <div className="text-center py-12">
                    <Phone className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-semibold">No phone number</h3>
                    <p className="text-muted-foreground mt-2">Add a phone number to make calls</p>
                  </div>
                ) : !contact.communications || contact.communications.filter((c: any) => c.subject === 'Phone Call').length === 0 ? (
                  <div className="text-center py-12">
                    <Phone className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-semibold">No calls yet</h3>
                    <p className="text-muted-foreground mt-2">Make your first call to get started</p>
                    <Button
                      onClick={() => setMakeCallDialogOpen(true)}
                      className="mt-4 bg-green-600 hover:bg-green-700"
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Make Call
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {contact.communications
                      .filter((c: any) => c.subject === 'Phone Call')
                      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((comm: any, idx: number) => (
                        <div key={idx} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className={`px-2 py-1 text-xs font-medium rounded flex items-center gap-1 ${
                                  comm.direction === 'sent' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                  <Phone className="h-3 w-3" />
                                  {comm.direction === 'sent' ? 'Outbound' : 'Inbound'}
                                </span>
                                <span className="text-xs text-gray-600">{comm.email}</span>
                                <span className="text-xs text-gray-400">•</span>
                                <span className="text-xs text-gray-600">{new Date(comm.date).toLocaleString()}</span>
                              </div>
                              <div className="text-sm text-gray-700 mb-2">
                                {comm.body || 'Call initiated'}
                              </div>
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                {comm.messageId && (
                                  <span>Call ID: {comm.messageId}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Gmail Composer */}
      <GmailComposer
        isOpen={sendEmailDialogOpen}
        onClose={() => {
          setSendEmailDialogOpen(false);
          setReplyTo('');
          setReplySubject('');
          setReplyBody('');
        }}
        propertyId={""}
        contactId={id}
        defaultTo={replyTo || contact?.email || ''}
        defaultSubject={replySubject}
        defaultBody={replyBody}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['contact', id] });
        }}
      />

      {/* Call Dialog */}
      <MakeCallDialog
        open={makeCallDialogOpen}
        onClose={() => setMakeCallDialogOpen(false)}
        contactId={id}
        contactName={`${contact.firstName} ${contact.lastName}`}
        contactPhone={contact.phone}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['contact', id] });
        }}
      />
    </div>
  );
}
