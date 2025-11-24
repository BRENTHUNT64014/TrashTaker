'use client';

import { use, useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Mail, Edit, MoreVertical, Calendar, User, Building2, MapPin, Phone, DollarSign, Check, X, Plus, CheckSquare, ChevronDown } from 'lucide-react';
import { PropertyDialog } from '@/components/properties/property-dialog';
import { ContactDialog } from '@/components/crm/contact-dialog';
import GmailComposer from '@/components/property/gmail-composer';
import TaskDialog from '@/components/tasks/task-dialog';
import MeetingDialog from '@/components/meetings/meeting-dialog';
import { useSession } from 'next-auth/react';
import { UserRole } from '@/types/enums';

export default function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [sendEmailDialogOpen, setSendEmailDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [replyTo, setReplyTo] = useState<string>('');
  const [replySubject, setReplySubject] = useState<string>('');
  const [replyBody, setReplyBody] = useState<string>('');
  const [editingMeetingIndex, setEditingMeetingIndex] = useState<string | null>(null);
  const [meetingNotes, setMeetingNotes] = useState<string>('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [viewMeetingNotesDialogOpen, setViewMeetingNotesDialogOpen] = useState(false);
  const [selectedMeetingForView, setSelectedMeetingForView] = useState<any>(null);
  const [fetchingTranscript, setFetchingTranscript] = useState<string | null>(null);
  const [addNewMenuOpen, setAddNewMenuOpen] = useState(false);
  const [closedMeetingsExpanded, setClosedMeetingsExpanded] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [propertyManagerSearchQuery, setPropertyManagerSearchQuery] = useState('');
  const [showPropertyManagerDropdown, setShowPropertyManagerDropdown] = useState(false);
  const [companySearchQuery, setCompanySearchQuery] = useState('');
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [managementChangeDialogOpen, setManagementChangeDialogOpen] = useState(false);
  const [newManagementCompany, setNewManagementCompany] = useState<any>(null);
  const [newPropertyManager, setNewPropertyManager] = useState<any>(null);
  const [newRegionalManager, setNewRegionalManager] = useState<any>(null);
  const [managementCompanySearch, setManagementCompanySearch] = useState('');
  const [propertyManagerSearch, setPropertyManagerSearch] = useState('');
  const [regionalManagerSearch, setRegionalManagerSearch] = useState('');
  const [showManagementCompanyDropdown, setShowManagementCompanyDropdown] = useState(false);
  const [showPMDropdown, setShowPMDropdown] = useState(false);
  const [showRMDropdown, setShowRMDropdown] = useState(false);
  const [savingManagementChange, setSavingManagementChange] = useState(false);
  const [showAllReceivedEmails, setShowAllReceivedEmails] = useState(false);
  const [showAllSentEmails, setShowAllSentEmails] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const addressInputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<any>(null);

  // Load Google Places API
  useEffect(() => {
    // Check if already loaded
    if (window.google?.maps?.places) {
      console.log('Google Maps already loaded');
      setIsScriptLoaded(true);
      return;
    }

    // Check if script already exists in DOM
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      console.log('Google Maps script already in DOM');
      existingScript.addEventListener('load', () => setIsScriptLoaded(true));
      return;
    }

    if (isScriptLoaded) return;

    console.log('Loading Google Maps script');
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('Google Maps script loaded');
      setIsScriptLoaded(true);
    };
    script.onerror = () => {
      console.error('Failed to load Google Maps script');
    };
    document.head.appendChild(script);
  }, []);

  // Initialize autocomplete when script loads and field is being edited
  useEffect(() => {
    if (!isScriptLoaded || !addressInputRef.current || autocompleteRef.current || editingField !== 'address.street') {
      return;
    }

    console.log('Initializing Google Places Autocomplete');

    try {
      const autocomplete = new window.google.maps.places.Autocomplete(addressInputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'us' },
        fields: ['address_components', 'formatted_address']
      });

      autocomplete.addListener('place_changed', async () => {
        console.log('Place changed');
        const place = autocomplete.getPlace();
        
        if (!place.address_components) {
          console.log('No address components');
          return;
        }

        let street = '';
        let city = '';
        let state = '';
        let zip = '';
        let county = '';

        place.address_components.forEach((component) => {
          const types = component.types;
          if (types.includes('street_number')) street = component.long_name + ' ';
          if (types.includes('route')) street += component.long_name;
          if (types.includes('locality')) city = component.long_name;
          if (types.includes('administrative_area_level_1')) state = component.short_name;
          if (types.includes('postal_code')) zip = component.long_name;
          if (types.includes('administrative_area_level_2')) county = component.long_name.replace(' County', '');
        });

        console.log('Address data:', { street, city, state, zip, county });

        setIsSaving(true);
        try {
          const res = await fetch(`/api/properties/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              address: street.trim(),
              city,
              state,
              zip,
              county,
            }),
          });
          if (!res.ok) throw new Error('Failed to update');
          await queryClient.invalidateQueries({ queryKey: ['property', id] });
          setEditingField(null);
          setEditValue('');
        } catch (error) {
          console.error('Error updating:', error);
          alert('Failed to update address');
        } finally {
          setIsSaving(false);
        }
      });

      autocompleteRef.current = autocomplete;
      console.log('Autocomplete initialized');
    } catch (error) {
      console.error('Error initializing autocomplete:', error);
    }

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [isScriptLoaded, editingField, id, queryClient]);

  // Auto-sync emails every hour at the top of the hour
  useEffect(() => {
    if (!session?.accessToken || !id) return;

    const syncEmails = async () => {
      try {
        console.log('Auto-syncing emails for property:', id);
        const res = await fetch('/api/gmail/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ propertyId: id }),
        });
        if (res.ok) {
          queryClient.invalidateQueries({ queryKey: ['property', id] });
          console.log('Auto-sync complete');
        }
      } catch (error) {
        console.error('Auto-sync failed:', error);
      }
    };

    // Calculate milliseconds until next hour
    const now = new Date();
    const msUntilNextHour = (60 - now.getMinutes()) * 60 * 1000 - now.getSeconds() * 1000;

    // Sync immediately on load
    syncEmails();

    // Schedule first sync at top of next hour
    const firstTimeout = setTimeout(() => {
      syncEmails();
      // Then sync every hour after that
      const interval = setInterval(syncEmails, 60 * 60 * 1000);
      return () => clearInterval(interval);
    }, msUntilNextHour);

    return () => clearTimeout(firstTimeout);
  }, [session?.accessToken, id, queryClient]);

  const { data: property, isLoading } = useQuery({
    queryKey: ['property', id],
    queryFn: async () => {
      const res = await fetch(`/api/properties/${id}`);
      if (!res.ok) throw new Error('Failed to fetch property');
      return res.json();
    },
  });

  // Fetch sales users
  const { data: salesUsers = [] } = useQuery({
    queryKey: ['users', 'sales'],
    queryFn: async () => {
      const res = await fetch('/api/users?roles=SALES,SALES_MANAGER,VP_SALES');
      if (!res.ok) throw new Error('Failed to fetch sales users');
      return res.json();
    },
  });

  // Fetch tasks for this property
  const { data: propertyTasks = [] } = useQuery({
    queryKey: ['tasks', 'property', id],
    queryFn: async () => {
      console.log('Fetching tasks for property:', id);
      const res = await fetch(`/api/tasks?propertyId=${id}`);
      if (!res.ok) throw new Error('Failed to fetch tasks');
      const data = await res.json();
      console.log('Property tasks loaded:', data);
      return data;
    },
  });

  // Fetch contacts for search
  const { data: allContacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const res = await fetch('/api/contacts');
      if (!res.ok) throw new Error('Failed to fetch contacts');
      return res.json();
    },
  });

  // Fetch companies for search
  const { data: allCompanies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const res = await fetch('/api/companies');
      if (!res.ok) throw new Error('Failed to fetch companies');
      return res.json();
    },
  });

  // Filter contacts based on search query
  const filteredContacts = allContacts.filter((contact: any) => {
    const fullName = `${contact.firstName} ${contact.lastName}`.toLowerCase();
    const query = contactSearchQuery.toLowerCase();
    return fullName.includes(query) || contact.email?.toLowerCase().includes(query);
  });

  // Filter contacts for property manager search
  const filteredPropertyManagerContacts = allContacts.filter((contact: any) => {
    const fullName = `${contact.firstName} ${contact.lastName}`.toLowerCase();
    const query = propertyManagerSearchQuery.toLowerCase();
    return fullName.includes(query) || contact.email?.toLowerCase().includes(query);
  });

  // Filter companies based on search query
  const filteredCompanies = allCompanies.filter((company: any) => {
    const query = companySearchQuery.toLowerCase();
    return company.name?.toLowerCase().includes(query);
  });

  // Check if user can edit sales executive
  const canEditSalesExecutive = session?.user?.role === UserRole.ADMIN || 
                                 session?.user?.role === UserRole.SALES_MANAGER ||
                                 session?.user?.role === UserRole.VP_SALES;

  const handleSalesExecutiveChange = async (userId: string) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/properties/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountExecutive: userId }),
      });

      if (!res.ok) throw new Error('Failed to update sales executive');

      await queryClient.invalidateQueries({ queryKey: ['property', id] });
    } catch (error) {
      console.error('Error updating sales executive:', error);
      alert('Failed to update sales executive');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFieldUpdate = async (field: string, value: any) => {
    setIsSaving(true);
    try {
      let updateData: any = {};
      
      // Handle address autocomplete data
      if (field === 'address' && typeof value === 'object') {
        updateData.address = value.street;
        updateData.city = value.city;
        updateData.state = value.state;
        updateData.zip = value.zip;
        updateData.county = value.county;
        setEditingField(null);
        setEditValue('');
      } else {
        updateData = { [field]: value };
      }
      
      // If updating status, add status history entry
      if (field === 'status' && property.status !== value) {
        const newHistoryEntry = {
          status: value,
          previousStatus: property.status,
          changedAt: new Date().toISOString(),
          changedBy: session?.user?.name || session?.user?.email || 'Unknown',
          userId: session?.user?.id
        };
        
        updateData.statusHistory = [
          ...(property.statusHistory || []),
          newHistoryEntry
        ];
      }
      
      const res = await fetch(`/api/properties/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) throw new Error(`Failed to update ${field}`);

      await queryClient.invalidateQueries({ queryKey: ['property', id] });
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      alert(`Failed to update ${field}`);
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = (field: string, currentValue: any) => {
    setEditingField(field);
    setEditValue(currentValue || '');
  };

  const handleSaveField = async (field: string) => {
    if (editValue === (property[field] || '')) {
      setEditingField(null);
      return;
    }

    setIsSaving(true);
    try {
      const updateData: any = {};
      
      // Handle nested fields
      if (field === 'address.street') {
        updateData.address = editValue;
      } else if (field === 'address.city') {
        updateData.city = editValue;
      } else if (field === 'address.state') {
        updateData.state = editValue;
      } else if (field === 'address.zip') {
        updateData.zip = editValue;
      } else {
        updateData[field] = editValue;
      }

      const res = await fetch(`/api/properties/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) throw new Error('Failed to update property');

      await queryClient.invalidateQueries({ queryKey: ['property', id] });
      setEditingField(null);
    } catch (error) {
      console.error('Error updating property:', error);
      alert('Failed to update property');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const handleSyncEmails = async () => {
    if (!session?.accessToken) {
      alert('Please connect your Google account to sync emails');
      return;
    }

    setSyncing(true);
    try {
      const response = await fetch('/api/gmail/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sync emails');
      }

      const data = await response.json();
      await queryClient.invalidateQueries({ queryKey: ['property', id] });
      
      if (data.newCommunications > 0) {
        alert(`Successfully synced ${data.newCommunications} new email(s) from property contacts`);
      } else {
        alert('No new emails found');
      }
    } catch (error: any) {
      console.error('Error syncing emails:', error);
      alert(error.message || 'Failed to sync emails. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveMeetingNotes = async (calendarEventId: string) => {
    setSavingNotes(true);
    try {
      const response = await fetch(`/api/properties/${id}/meetings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          calendarEventId,
          aiNotes: meetingNotes 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save meeting notes');
      }

      await queryClient.invalidateQueries({ queryKey: ['property', id] });
      setEditingMeetingIndex(null);
      setMeetingNotes('');
      alert('Meeting notes saved successfully!');
    } catch (error) {
      console.error('Error saving meeting notes:', error);
      alert('Failed to save meeting notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleFetchMeetingTranscript = async (calendarEventId: string, meetingTitle: string) => {
    setFetchingTranscript(calendarEventId);
    try {
      const response = await fetch('/api/calendar/meetings/fetch-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          propertyId: id,
          calendarEventId 
        }),
      });

      const data = await response.json();

      if (data.success) {
        await queryClient.invalidateQueries({ queryKey: ['property', id] });
        alert(`✅ Meeting notes fetched successfully from Google Meet!\n\n"${meetingTitle}"\n\nThe AI-generated notes have been attached to this property.`);
      } else {
        const debugInfo = data.filesFound > 0 
          ? `\n\nDebug: Found ${data.filesFound} files, ${data.transcriptFilesFound || 0} transcript files`
          : '';
        alert(`${data.message}${debugInfo}\n\nSearched for: "${data.meetingTitle || meetingTitle}"`);
      }
    } catch (error) {
      console.error('Error fetching meeting transcript:', error);
      alert(`Failed to fetch meeting notes for "${meetingTitle}".\n\nMake sure:\n1. Recording was enabled in Google Meet\n2. The meeting has ended\n3. Google has finished processing (may take a few minutes)`);
    } finally {
      setFetchingTranscript(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Property not found</div>
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
                <Building2 className="h-6 w-6 text-gray-400" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{property.name}</h1>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                      property.status === 'Lead' ? 'bg-yellow-100 text-yellow-800' :
                      property.status === 'Sales Working' ? 'bg-blue-100 text-blue-800' :
                      property.status === 'Contract Signed' ? 'bg-purple-100 text-purple-800' :
                      property.status === 'Sent to Regional Director of Ops' ? 'bg-indigo-100 text-indigo-800' :
                      property.status === 'Sent to District Service Manager' ? 'bg-cyan-100 text-cyan-800' :
                      property.status === 'Current Client' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {property.status}
                    </span>
                    <span>•</span>
                    <span>Last Update: {new Date(property.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="border-gray-300 hover:bg-gray-50"
              onClick={() => setSendEmailDialogOpen(true)}
            >
              <Mail className="h-3.5 w-3.5 mr-1.5" />
              Send Email
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="border-gray-300 hover:bg-gray-50"
              onClick={() => setMeetingDialogOpen(true)}
            >
              <Calendar className="h-3.5 w-3.5 mr-1.5" />
              Schedule Meeting
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="border-gray-300 hover:bg-gray-50"
              onClick={() => {
                console.log('Add Task button clicked, opening dialog');
                setTaskDialogOpen(true);
              }}
            >
              <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
              Add Task
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="border-gray-300 hover:bg-gray-50"
              onClick={() => setManagementChangeDialogOpen(true)}
            >
              <Building2 className="h-3.5 w-3.5 mr-1.5" />
              Management Change
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-6 space-y-6">

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {/* ALN Info Card */}
            <div className="bg-white border p-4">
              <h3 className="text-sm font-semibold mb-3">ALN Info</h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">ALN ID</label>
                  {editingField === 'alnId' ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-8 text-sm"
                        disabled={isSaving}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSaveField('alnId')}
                        disabled={isSaving}
                        className="h-8 w-8 p-0"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted" onClick={() => startEditing('alnId', property.alnId)}>
                      {property.alnId || 'Click to add'}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">ALN Price Class</label>
                  {editingField === 'alnPriceClass' ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-8 text-sm"
                        disabled={isSaving}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSaveField('alnPriceClass')}
                        disabled={isSaving}
                        className="h-8 w-8 p-0"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted" onClick={() => startEditing('alnPriceClass', property.alnPriceClass)}>
                      {property.alnPriceClass || 'Click to add'}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Fee Managed</label>
                  {editingField === 'feeManaged' ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-8 text-sm"
                        disabled={isSaving}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSaveField('feeManaged')}
                        disabled={isSaving}
                        className="h-8 w-8 p-0"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted" onClick={() => startEditing('feeManaged', property.feeManaged)}>
                      {property.feeManaged || 'Click to add'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Admin Card */}
            <div className="bg-white border p-4">
              <h3 className="text-sm font-semibold mb-3">Admin</h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Sales Executive</label>
                  <Select
                    value={property.accountExecutive?._id || property.accountExecutive || ''}
                    onValueChange={handleSalesExecutiveChange}
                    disabled={isSaving}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select sales executive">
                        {property.accountExecutive
                          ? `${property.accountExecutive.firstName || ''} ${property.accountExecutive.lastName || ''}`
                          : 'Select sales executive'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {salesUsers.filter((u: any) => u.role === UserRole.SALES || u.role === 'SALES').map((user: any) => (
                        <SelectItem key={user._id} value={user._id}>
                          {user.firstName} {user.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Sales Manager</label>
                  <Select
                    value={property.salesManager?._id || property.salesManager || ''}
                    onValueChange={(value) => handleFieldUpdate('salesManager', value)}
                    disabled={isSaving}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select sales manager">
                        {property.salesManager
                          ? `${property.salesManager.firstName || ''} ${property.salesManager.lastName || ''}`
                          : 'Select sales manager'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {salesUsers.filter((u: any) => u.role === UserRole.SALES_MANAGER || u.role === 'SALES_MANAGER').map((user: any) => (
                        <SelectItem key={user._id} value={user._id}>
                          {user.firstName} {user.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Regional Director of Ops</label>
                  <Select
                    value={property.regionalDirectorOps?._id || property.regionalDirectorOps || ''}
                    onValueChange={(value) => handleFieldUpdate('regionalDirectorOps', value)}
                    disabled={isSaving}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select regional director">
                        {property.regionalDirectorOps
                          ? `${property.regionalDirectorOps.firstName || ''} ${property.regionalDirectorOps.lastName || ''}`
                          : 'Select regional director'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {salesUsers.filter((u: any) => u.role === 'REGIONAL_DIRECTOR_OPS').map((user: any) => (
                        <SelectItem key={user._id} value={user._id}>
                          {user.firstName} {user.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">District Service Manager</label>
                  <Select
                    value={property.districtServiceManager?._id || property.districtServiceManager || ''}
                    onValueChange={(value) => handleFieldUpdate('districtServiceManager', value)}
                    disabled={isSaving}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select district service manager">
                        {property.districtServiceManager
                          ? `${property.districtServiceManager.firstName || ''} ${property.districtServiceManager.lastName || ''}`
                          : 'Select district service manager'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {salesUsers.filter((u: any) => u.role === 'DISTRICT_SERVICE_MANAGER').map((user: any) => (
                        <SelectItem key={user._id} value={user._id}>
                          {user.firstName} {user.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Property Information Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Property Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Property Name *</label>
                  {editingField === 'name' ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-8 text-sm"
                        disabled={isSaving}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSaveField('name')}
                        disabled={isSaving}
                        className="h-8 w-8 p-0"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted" onClick={() => startEditing('name', property.name)}>
                      {property.name}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Units *</label>
                  {editingField === 'unitCount' ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-8 text-sm"
                        disabled={isSaving}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSaveField('unitCount')}
                        disabled={isSaving}
                        className="h-8 w-8 p-0"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted" onClick={() => startEditing('unitCount', property.unitCount)}>
                      {property.unitCount}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Management Company *</label>
                  {editingField === 'company' ? (
                    <div className="relative">
                      <div className="flex items-center gap-2">
                        <Input
                          value={companySearchQuery}
                          onChange={(e) => {
                            setCompanySearchQuery(e.target.value);
                            setShowCompanyDropdown(true);
                          }}
                          onFocus={() => setShowCompanyDropdown(true)}
                          placeholder="Search companies..."
                          className="h-8 text-sm"
                          disabled={isSaving}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingField(null);
                            setCompanySearchQuery('');
                            setShowCompanyDropdown(false);
                          }}
                          disabled={isSaving}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      {showCompanyDropdown && companySearchQuery && filteredCompanies.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {filteredCompanies.slice(0, 10).map((company: any) => (
                            <div
                              key={company._id}
                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                              onClick={async () => {
                                setIsSaving(true);
                                try {
                                  const res = await fetch(`/api/properties/${id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ company: company._id }),
                                  });
                                  if (!res.ok) throw new Error('Failed to update');
                                  await queryClient.invalidateQueries({ queryKey: ['property', id] });
                                  setEditingField(null);
                                  setCompanySearchQuery('');
                                  setShowCompanyDropdown(false);
                                } catch (error) {
                                  console.error('Error updating:', error);
                                  alert('Failed to update');
                                } finally {
                                  setIsSaving(false);
                                }
                              }}
                            >
                              <div className="font-medium">{company.name}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="relative">
                      <p 
                        className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted"
                        onClick={() => {
                          if (property.company?._id) {
                            const dropdown = document.getElementById('company-action-dropdown');
                            if (dropdown) dropdown.classList.toggle('hidden');
                          } else {
                            setEditingField('company');
                            setCompanySearchQuery('');
                            setShowCompanyDropdown(false);
                          }
                        }}
                      >
                        {property.company?.name || 'Click to add'}
                      </p>
                      {property.company?._id && (
                        <div id="company-action-dropdown" className="hidden absolute z-50 mt-1 bg-white border rounded-md shadow-lg">
                          <button
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                            onClick={() => {
                              setEditingField('company');
                              setCompanySearchQuery('');
                              setShowCompanyDropdown(false);
                              document.getElementById('company-action-dropdown')?.classList.add('hidden');
                            }}
                          >
                            Edit Company
                          </button>
                          <button
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                            onClick={() => {
                              router.push(`/dashboard/crm/companies/${property.company._id}`);
                            }}
                          >
                            Go to Company
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Phone Number</label>
                  {editingField === 'phone' ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-8 text-sm"
                        disabled={isSaving}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSaveField('phone')}
                        disabled={isSaving}
                        className="h-8 w-8 p-0"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted" onClick={() => startEditing('phone', property.phone)}>
                      {property.phone || 'Click to add'}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Office Email</label>
                  {editingField === 'officeEmail' ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-8 text-sm"
                        disabled={isSaving}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSaveField('officeEmail')}
                        disabled={isSaving}
                        className="h-8 w-8 p-0"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted" onClick={() => startEditing('officeEmail', typeof property.officeEmail === 'string' ? property.officeEmail : property.officeEmail?.email)}>
                      {typeof property.officeEmail === 'string' ? property.officeEmail : (property.officeEmail?.email || 'Click to add')}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Area Supervisor/Regional Manager</label>
                  {editingField === 'areaSupervisor' ? (
                    <div className="relative">
                      <div className="flex items-center gap-2">
                        <Input
                          value={contactSearchQuery}
                          onChange={(e) => {
                            setContactSearchQuery(e.target.value);
                            setShowContactDropdown(true);
                          }}
                          onFocus={() => setShowContactDropdown(true)}
                          placeholder="Search contacts..."
                          className="h-8 text-sm"
                          disabled={isSaving}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingField(null);
                            setContactSearchQuery('');
                            setShowContactDropdown(false);
                          }}
                          disabled={isSaving}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      {showContactDropdown && contactSearchQuery && filteredContacts.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {filteredContacts.slice(0, 10).map((contact: any) => (
                            <div
                              key={contact._id}
                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                              onClick={async () => {
                                setIsSaving(true);
                                try {
                                  const res = await fetch(`/api/properties/${id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ 
                                      regionalManager: contact._id
                                    }),
                                  });
                                  if (!res.ok) throw new Error('Failed to update');
                                  await queryClient.invalidateQueries({ queryKey: ['property', id] });
                                  setEditingField(null);
                                  setContactSearchQuery('');
                                  setShowContactDropdown(false);
                                } catch (error) {
                                  console.error('Error updating:', error);
                                  alert('Failed to update');
                                } finally {
                                  setIsSaving(false);
                                }
                              }}
                            >
                              <div className="font-medium">{contact.firstName} {contact.lastName}</div>
                              {contact.email && <div className="text-xs text-gray-500">{contact.email}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p 
                      className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted" 
                      onClick={() => {
                        setEditingField('areaSupervisor');
                        setContactSearchQuery('');
                        setShowContactDropdown(false);
                      }}
                    >
                      {property.regionalManager ? `${property.regionalManager.firstName} ${property.regionalManager.lastName}` : 'Click to add'}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Property Manager</label>
                  {editingField === 'propertyManager' ? (
                    <div className="relative">
                      <div className="flex items-center gap-2">
                        <Input
                          value={propertyManagerSearchQuery}
                          onChange={(e) => {
                            setPropertyManagerSearchQuery(e.target.value);
                            setShowPropertyManagerDropdown(true);
                          }}
                          onFocus={() => setShowPropertyManagerDropdown(true)}
                          placeholder="Search contacts..."
                          className="h-8 text-sm"
                          disabled={isSaving}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingField(null);
                            setPropertyManagerSearchQuery('');
                            setShowPropertyManagerDropdown(false);
                          }}
                          disabled={isSaving}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      {showPropertyManagerDropdown && propertyManagerSearchQuery && filteredPropertyManagerContacts.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {filteredPropertyManagerContacts.slice(0, 10).map((contact: any) => (
                            <div
                              key={contact._id}
                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                              onClick={async () => {
                                setIsSaving(true);
                                try {
                                  const res = await fetch(`/api/properties/${id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ propertyManager: contact._id }),
                                  });
                                  if (!res.ok) throw new Error('Failed to update');
                                  await queryClient.invalidateQueries({ queryKey: ['property', id] });
                                  setEditingField(null);
                                  setPropertyManagerSearchQuery('');
                                  setShowPropertyManagerDropdown(false);
                                } catch (error) {
                                  console.error('Error updating:', error);
                                  alert('Failed to update');
                                } finally {
                                  setIsSaving(false);
                                }
                              }}
                            >
                              <div className="font-medium">{contact.firstName} {contact.lastName}</div>
                              {contact.email && <div className="text-xs text-gray-500">{contact.email}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p 
                      className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted"
                      onClick={() => {
                        setEditingField('propertyManager');
                        setPropertyManagerSearchQuery('');
                        setShowPropertyManagerDropdown(false);
                      }}
                    >
                      {property.propertyManager ? `${property.propertyManager.firstName} ${property.propertyManager.lastName}` : 'Click to add'}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Status *</label>
                  <Select
                    value={property.status || ''}
                    onValueChange={(value) => handleFieldUpdate('status', value)}
                    disabled={isSaving}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Lead">Lead</SelectItem>
                      <SelectItem value="Sales Working">Sales Working</SelectItem>
                      <SelectItem value="Contract Signed">Contract Signed</SelectItem>
                      <SelectItem value="Sent to Regional Director of Ops">Sent to Regional Director of Ops</SelectItem>
                      <SelectItem value="Sent to District Service Manager">Sent to District Service Manager</SelectItem>
                      <SelectItem value="Current Client">Current Client</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Property Owner Name</label>
                  {editingField === 'ownerName' ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-8 text-sm"
                        disabled={isSaving}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSaveField('ownerName')}
                        disabled={isSaving}
                        className="h-8 w-8 p-0"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted" onClick={() => startEditing('ownerName', property.ownerName)}>
                      {property.ownerName || 'Click to add'}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address Information Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Address Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Street</label>
                  {editingField === 'address.street' ? (
                    <div className="flex items-center gap-2 flex-1">
                      <div className="relative flex-1">
                        <Input
                          ref={addressInputRef}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-8 text-sm"
                          disabled={isSaving || !isScriptLoaded}
                          placeholder={isScriptLoaded ? "Start typing address..." : "Loading Google Maps..."}
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSaveField('address.street')}
                        disabled={isSaving}
                        className="h-8 w-8 p-0"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted" onClick={() => startEditing('address.street', property.address?.street)}>
                      {property.address?.street || 'Click to add'}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">City</label>
                  {editingField === 'address.city' ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-8 text-sm"
                        disabled={isSaving}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSaveField('address.city')}
                        disabled={isSaving}
                        className="h-8 w-8 p-0"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted" onClick={() => startEditing('address.city', property.address?.city)}>
                      {property.address?.city || 'Click to add'}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">State</label>
                  <Select
                    value={property.address?.state || ''}
                    onValueChange={(value) => handleFieldUpdate('state', value)}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AL">Alabama</SelectItem>
                      <SelectItem value="AK">Alaska</SelectItem>
                      <SelectItem value="AZ">Arizona</SelectItem>
                      <SelectItem value="AR">Arkansas</SelectItem>
                      <SelectItem value="CA">California</SelectItem>
                      <SelectItem value="CO">Colorado</SelectItem>
                      <SelectItem value="CT">Connecticut</SelectItem>
                      <SelectItem value="DE">Delaware</SelectItem>
                      <SelectItem value="FL">Florida</SelectItem>
                      <SelectItem value="GA">Georgia</SelectItem>
                      <SelectItem value="TX">Texas</SelectItem>
                      <SelectItem value="MO">Missouri</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Zip Code</label>
                  {editingField === 'address.zip' ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-8 text-sm"
                        disabled={isSaving}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSaveField('address.zip')}
                        disabled={isSaving}
                        className="h-8 w-8 p-0"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted" onClick={() => startEditing('address.zip', property.address?.zipCode || property.address?.zip)}>
                      {property.address?.zipCode || property.address?.zip || 'Click to add'}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">County</label>
                  {editingField === 'county' ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-8 text-sm"
                        disabled={isSaving}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSaveField('county')}
                        disabled={isSaving}
                        className="h-8 w-8 p-0"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted" onClick={() => startEditing('county', property.county)}>
                      {property.county || 'Click to add'}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Longitude</label>
                  <p className="text-sm py-1.5 px-2">{property.location?.coordinates?.[0] || '-'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Latitude</label>
                  <p className="text-sm py-1.5 px-2">{property.location?.coordinates?.[1] || '-'}</p>
                </div>
              </div>
              <div className="flex justify-center mt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-8"
                  onClick={() => {
                    if (property.address?.street || property.address?.city) {
                      const address = `${property.address?.street || ''} ${property.address?.city || ''} ${property.address?.state || ''} ${property.address?.zipCode || property.address?.zip || ''}`.trim();
                      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
                    } else {
                      alert('No address available');
                    }
                  }}
                >
                  <MapPin className="h-3.5 w-3.5 mr-1.5" />
                  Locate on Map
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Contract Info Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Contract Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Contract Door Rate</label>
                  <p className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted">-</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Contract Term</label>
                  <p className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted">-</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Monthly Revenue</label>
                  <p className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted">-</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Renewal Status</label>
                  <p className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted">-</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Initial Start Date</label>
                  <p className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted">-</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Termination Fee</label>
                  <p className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted">-</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Term End Date</label>
                  <p className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted">-</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Escalation Clause</label>
                  <p className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted">-</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Renewal Signature Date</label>
                  <p className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted">-</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Concession</label>
                  <p className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted">-</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Renewal Effective Date</label>
                  <p className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted">-</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Startup Type</label>
                  <p className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted">-</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Renewal Date</label>
                  <p className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted">-</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Minimum Invoice</label>
                  <p className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted">-</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Compliance Vendor</label>
                  <p className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted">-</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Bid Date</label>
                  <p className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted">-</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Current Door Rate</label>
                  <p className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted">-</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service Info Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Service Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Service Start Date</label>
                  <p className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted">-</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Container Type</label>
                  <p className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted">-</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Start Time</label>
                  <p className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted">-</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Service Schedule</label>
                  <p className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted">-</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Service Package</label>
                  <p className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted">-</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Building Style</label>
                  <p className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted">-</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Time Zone</label>
                  <p className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted">-</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Collection Options</label>
                  <p className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted">-</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes Card */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Notes</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setNoteDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Note
              </Button>
            </CardHeader>
            <CardContent>
              {property.notes && property.notes.length > 0 ? (
                <div className="space-y-3">
                  {property.notes.map((note: any, index: number) => (
                    <div key={index} className="border-l-2 border-blue-500 pl-3 py-2">
                      <div className="text-xs text-gray-500 mb-1">
                        {new Date(note.createdAt).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No notes added yet</p>
              )}
            </CardContent>
          </Card>

          {/* Connected Records Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Connected Records</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">For future use</p>
            </CardContent>
          </Card>

          {/* Attachments Card */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Attachments</CardTitle>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => document.getElementById('file-upload-input')?.click()}
                disabled={uploadingFile}
              >
                <Plus className="h-4 w-4 mr-1" />
                {uploadingFile ? 'Uploading...' : 'Attach File'}
              </Button>
              <input
                id="file-upload-input"
                type="file"
                className="hidden"
                aria-label="Upload file"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  
                  setUploadingFile(true);
                  try {
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('propertyId', id);
                    
                    const res = await fetch('/api/properties/attachments', {
                      method: 'POST',
                      body: formData,
                    });
                    
                    if (!res.ok) throw new Error('Failed to upload file');
                    
                    await queryClient.invalidateQueries({ queryKey: ['property', id] });
                    alert('File uploaded successfully');
                  } catch (error) {
                    console.error('Error uploading file:', error);
                    alert('Failed to upload file');
                  } finally {
                    setUploadingFile(false);
                    e.target.value = '';
                  }
                }}
              />
            </CardHeader>
            <CardContent>
              {property.attachments && property.attachments.length > 0 ? (
                <div className="space-y-2">
                  {property.attachments.map((attachment: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded hover:bg-gray-50">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium">{attachment.filename || attachment.name}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(attachment.uploadedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(attachment.url, '_blank')}
                      >
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No attachments</p>
              )}
            </CardContent>
          </Card>

          {/* Status History Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Status History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-4 text-xs font-semibold border-b pb-2">
                  <div>Status</div>
                  <div>Duration (Days)</div>
                  <div>Modified Time</div>
                  <div>Modified By</div>
                </div>
                {property.statusHistory && property.statusHistory.length > 0 ? (
                  <div className="space-y-2">
                    {property.statusHistory.slice().reverse().map((history: any, index: number) => {
                      // Calculate duration
                      const currentDate = index === 0 ? new Date() : new Date(property.statusHistory[property.statusHistory.length - index].changedAt);
                      const startDate = new Date(history.changedAt);
                      const durationDays = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                      
                      return (
                        <div key={index} className="grid grid-cols-4 gap-4 text-xs py-2 border-b last:border-0">
                          <div className="font-medium">{history.status}</div>
                          <div>{durationDays} {durationDays === 1 ? 'day' : 'days'}</div>
                          <div>
                            {new Date(history.changedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                          <div>{history.changedBy || 'Unknown'}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground py-4">No status history available</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Deals Card */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Deals</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline">Assign</Button>
                <Button size="sm" variant="outline">New Deal</Button>
                <Button size="sm" variant="outline">Edit</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="grid grid-cols-5 gap-4 text-xs font-semibold border-b pb-2">
                  <div>Deal Name</div>
                  <div>Stage</div>
                  <div>Closing Date</div>
                  <div>Created Time</div>
                  <div>Start Type</div>
                </div>
                <div className="text-xs text-muted-foreground py-4">No deals found</div>
              </div>
            </CardContent>
          </Card>

          {/* Contacts Section */}
            <div className="bg-white border rounded-lg">
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="text-base font-semibold">Contacts</h3>
                <Button size="sm" onClick={() => setContactDialogOpen(true)} className="bg-[#03C066] hover:bg-[#02a055] text-white h-8">
                  + Add Contact
                </Button>
              </div>
              <div className="p-4">
                <table className="w-full">
                  <thead className="border-b">
                    <tr className="text-left">
                      <th className="pb-2 text-xs font-semibold">Name</th>
                      <th className="pb-2 text-xs font-semibold">Title</th>
                      <th className="pb-2 text-xs font-semibold">Email</th>
                      <th className="pb-2 text-xs font-semibold">Phone</th>
                      <th className="pb-2 text-xs font-semibold">Phone</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {property.propertyManager && (
                      <tr className="border-b last:border-0 hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/dashboard/crm/contacts/${property.propertyManager._id}`)}>
                        <td className="py-2 text-xs text-blue-600 hover:underline font-medium">
                          {property.propertyManager.firstName} {property.propertyManager.lastName}
                        </td>
                        <td className="py-2 text-xs">Property Manager</td>
                        <td className="py-2 text-xs">{property.propertyManager.email || '-'}</td>
                        <td className="py-2 text-xs">{property.propertyManager.phone || '-'}</td>
                        <td className="py-3">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/crm/contacts/${property.propertyManager._id}`);
                            }}
                          >
                            <Edit className="h-3.5 w-3.5 text-gray-400" />
                          </Button>
                        </td>
                      </tr>
                    )}
                    {property.regionalManager && (
                      <tr className="border-b last:border-0 hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/dashboard/crm/contacts/${property.regionalManager._id}`)}>
                        <td className="py-2 text-xs text-blue-600 hover:underline font-medium">
                          {property.regionalManager.firstName} {property.regionalManager.lastName}
                        </td>
                        <td className="py-2 text-xs">Regional Manager</td>
                        <td className="py-2 text-xs">{property.regionalManager.email || '-'}</td>
                        <td className="py-2 text-xs">{property.regionalManager.phone || '-'}</td>
                        <td className="py-2">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/crm/contacts/${property.regionalManager._id}`);
                            }}
                          >
                            <Edit className="h-3.5 w-3.5 text-gray-400" />
                          </Button>
                        </td>
                      </tr>
                    )}
                    {!property.propertyManager && !property.regionalManager && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-xs text-gray-500">
                          No contacts added yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Management Changes Section */}
            <div className="bg-white border rounded-lg">
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="text-base font-semibold text-gray-900">Management Changes</h3>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setManagementChangeDialogOpen(true)}
                >
                  <Building2 className="h-4 w-4 mr-1" />
                  Record Change
                </Button>
              </div>
              <div className="p-4">
                {property.changeLog && property.changeLog.length > 0 ? (
                  <div className="space-y-3">
                    {property.changeLog.slice().reverse().map((log: any, index: number) => (
                      <div key={index} className="border-l-2 border-[#03C066] pl-4 py-2">
                        <div className="text-xs text-gray-500 mb-1">
                          {new Date(log.date).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        <div className="space-y-1">
                          {log.changes.map((change: string, changeIndex: number) => (
                            <div key={changeIndex} className="text-sm text-gray-700">
                              {change}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 text-center py-6">
                    No management changes recorded
                  </div>
                )}
              </div>
            </div>



            {/* Emails Section */}
            <div className="bg-white border rounded-lg">
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="text-base font-semibold">Emails</h3>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={handleSyncEmails}
                    disabled={syncing}
                  >
                    {syncing ? 'Syncing...' : 'Sync Gmail'}
                  </Button>
                  <Button size="sm" className="bg-[#03C066] hover:bg-[#02a055] h-8" onClick={() => setSendEmailDialogOpen(true)}>
                    Compose Email
                  </Button>
                </div>
              </div>
              
              <Tabs defaultValue="received" className="w-full">
                <div className="border-b px-4">
                  <TabsList className="bg-transparent border-b-0 h-auto p-0">
                    <TabsTrigger 
                      value="received" 
                      className="data-[state=active]:border-b-2 data-[state=active]:border-[#03C066] data-[state=active]:text-[#03C066] rounded-none bg-transparent"
                    >
                      Received
                    </TabsTrigger>
                    <TabsTrigger 
                      value="sent" 
                      className="data-[state=active]:border-b-2 data-[state=active]:border-[#03C066] data-[state=active]:text-[#03C066] rounded-none bg-transparent"
                    >
                      Sent
                    </TabsTrigger>
                    <TabsTrigger 
                      value="drafts" 
                      className="data-[state=active]:border-b-2 data-[state=active]:border-[#03C066] data-[state=active]:text-[#03C066] rounded-none bg-transparent"
                    >
                      Drafts
                    </TabsTrigger>
                    <TabsTrigger 
                      value="scheduled" 
                      className="data-[state=active]:border-b-2 data-[state=active]:border-[#03C066] data-[state=active]:text-[#03C066] rounded-none bg-transparent"
                    >
                      Scheduled
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="received" className="p-4 m-0">
                  {!property.communications || property.communications.filter((c: any) => c.direction === 'received' && c.subject !== 'SMS Message' && c.subject !== 'Phone Call').length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-sm text-gray-500">No records found</div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(() => {
                        const receivedEmails = property.communications
                          .filter((c: any) => c.direction === 'received' && c.subject !== 'SMS Message' && c.subject !== 'Phone Call')
                          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
                        const displayEmails = showAllReceivedEmails ? receivedEmails : receivedEmails.slice(0, 2);
                        const remainingCount = receivedEmails.length - 2;
                        
                        return (
                          <>
                            {displayEmails.map((comm: any, idx: number) => (
                          <details key={idx} className="border rounded-lg group">
                            <summary className="cursor-pointer list-none p-4 hover:bg-gray-50">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <span className={`px-2 py-1 text-xs font-medium rounded flex items-center gap-1 ${
                                      comm.direction === 'sent' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                    }`}>
                                      <Mail className="h-3 w-3" />
                                      {comm.direction === 'sent' ? 'Sent' : 'Received'}
                                    </span>
                                    <span className="text-sm font-medium">{comm.subject}</span>
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    {comm.direction === 'sent' ? 'To:' : 'From:'} {comm.email}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {new Date(comm.date).toLocaleString()}
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="opacity-0 group-open:opacity-100"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setReplyTo(comm.email);
                                    setReplySubject(comm.subject.startsWith('Re:') ? comm.subject : `Re: ${comm.subject}`);
                                    setReplyBody(comm.body ? `\n\n---\nOn ${new Date(comm.date).toLocaleString()}, ${comm.email} wrote:\n${comm.body}` : '');
                                    setSendEmailDialogOpen(true);
                                  }}
                                >
                                  Reply
                                </Button>
                              </div>
                            </summary>
                            {comm.body && (
                              <div className="px-4 pb-4 pt-2">
                                <div 
                                  className="text-sm bg-gray-50 p-4 rounded border max-h-96 overflow-y-auto"
                                  dangerouslySetInnerHTML={{ __html: comm.body }}
                                />
                              </div>
                            )}
                          </details>
                            ))}
                            {!showAllReceivedEmails && remainingCount > 0 && (
                              <div className="flex justify-center pt-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setShowAllReceivedEmails(true)}
                                  className="text-xs"
                                >
                                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full mr-2">
                                    +{remainingCount}
                                  </span>
                                  Show all emails
                                </Button>
                              </div>
                            )}
                            {showAllReceivedEmails && receivedEmails.length > 2 && (
                              <div className="flex justify-center pt-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setShowAllReceivedEmails(false)}
                                  className="text-xs"
                                >
                                  Show less
                                </Button>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="sent" className="p-4 m-0">
                  {!property.communications || property.communications.filter((c: any) => c.direction === 'sent' && c.subject !== 'SMS Message' && c.subject !== 'Phone Call').length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-sm text-gray-500">No records found</div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(() => {
                        const sentEmails = property.communications
                          .filter((c: any) => c.direction === 'sent' && c.subject !== 'SMS Message' && c.subject !== 'Phone Call')
                          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
                        const displayEmails = showAllSentEmails ? sentEmails : sentEmails.slice(0, 2);
                        const remainingCount = sentEmails.length - 2;
                        
                        return (
                          <>
                            {displayEmails.map((comm: any, idx: number) => (
                          <details key={idx} className="border rounded-lg group">
                            <summary className="cursor-pointer list-none p-4 hover:bg-gray-50">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <span className="px-2 py-1 text-xs font-medium rounded flex items-center gap-1 bg-blue-100 text-blue-700">
                                      <Mail className="h-3 w-3" />
                                      Sent
                                    </span>
                                    <span className="text-sm font-medium">{comm.subject}</span>
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    To: {comm.email}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {new Date(comm.date).toLocaleString()}
                                  </div>
                                </div>
                              </div>
                            </summary>
                            {comm.body && (
                              <div className="px-4 pb-4 pt-2">
                                <div 
                                  className="text-sm bg-gray-50 p-4 rounded border max-h-96 overflow-y-auto"
                                  dangerouslySetInnerHTML={{ __html: comm.body }}
                                />
                              </div>
                            )}
                          </details>
                            ))}
                            {!showAllSentEmails && remainingCount > 0 && (
                              <div className="flex justify-center pt-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setShowAllSentEmails(true)}
                                  className="text-xs"
                                >
                                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full mr-2">
                                    +{remainingCount}
                                  </span>
                                  Show all emails
                                </Button>
                              </div>
                            )}
                            {showAllSentEmails && sentEmails.length > 2 && (
                              <div className="flex justify-center pt-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setShowAllSentEmails(false)}
                                  className="text-xs"
                                >
                                  Show less
                                </Button>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="drafts" className="p-4 m-0">
                  <div className="text-center py-12">
                    <div className="text-sm text-gray-500">No records found</div>
                  </div>
                </TabsContent>

                <TabsContent value="scheduled" className="p-4 m-0">
                  <div className="text-center py-12">
                    <div className="text-sm text-gray-500">No records found</div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Open Activities Section */}
            <div className="bg-white border rounded-lg">
              <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                <h2 className="text-base font-semibold">Open Activities</h2>
                <div className="relative">
                  <Button
                    size="sm"
                    className="bg-[#03C066] hover:bg-[#02a055] text-white h-8"
                    onClick={() => setAddNewMenuOpen(!addNewMenuOpen)}
                  >
                    Add New
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                  {addNewMenuOpen && (
                    <div className="absolute right-0 mt-1 w-48 bg-white border rounded-md shadow-lg z-10">
                      <button
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                        onClick={() => {
                          setTaskDialogOpen(true);
                          setAddNewMenuOpen(false);
                        }}
                      >
                        <CheckSquare className="h-4 w-4" />
                        Task
                      </button>
                      <button
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                        onClick={() => {
                          setMeetingDialogOpen(true);
                          setAddNewMenuOpen(false);
                        }}
                      >
                        <Calendar className="h-4 w-4" />
                        Meeting
                      </button>
                      <button
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                        onClick={() => {
                          setAddNewMenuOpen(false);
                          alert('Call feature coming soon');
                        }}
                      >
                        <Phone className="h-4 w-4" />
                        Call
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-0 divide-x">
                {/* Open Tasks */}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckSquare className="h-4 w-4" />
                    <h3 className="text-sm font-semibold">Open Tasks</h3>
                    <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">{propertyTasks?.filter((t: any) => t.status !== 'Completed').length || 0}</span>
                  </div>
                  {propertyTasks && propertyTasks.filter((t: any) => t.status !== 'Completed').length > 0 ? (
                    <div className="space-y-4">
                      {propertyTasks
                        .filter((t: any) => t.status !== 'Completed')
                        .map((task: any) => (
                          <div key={task._id} className="pb-3 border-b last:border-0">
                            <div 
                              className="text-sm font-medium text-blue-600 hover:underline cursor-pointer mb-1"
                              onClick={() => router.push(`/dashboard/tasks/${task._id}`)}
                            >
                              {task.title}
                            </div>
                            <div className="text-xs text-gray-600">
                              {task.dueDate && new Date(task.dueDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </div>
                            {task.assignedTo && (
                              <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                                <User className="h-3 w-3" />
                                {task.assignedTo.name}
                              </div>
                            )}
                            <div className="text-xs text-gray-600 mt-1">
                              Status: {task.status}
                            </div>
                            <div className="text-xs text-gray-600">Priority: {task.priority || 'None'}</div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center text-sm text-gray-500 py-8">No records found</div>
                  )}
                </div>

                {/* Open Meetings */}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="h-4 w-4" />
                    <h3 className="text-sm font-semibold">Open Meetings</h3>
                    <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">{property.meetings?.filter((m: any) => new Date(m.date) >= new Date()).length || 0}</span>
                  </div>
                  {property.meetings && property.meetings.filter((m: any) => new Date(m.date) >= new Date()).length > 0 ? (
                    <div className="space-y-4">
                      {property.meetings
                        .filter((m: any) => new Date(m.date) >= new Date())
                        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .map((meeting: any, idx: number) => (
                          <div key={idx} className="pb-3 border-b last:border-0">
                            <div className="text-sm font-medium text-blue-600 mb-1">{meeting.title}</div>
                            <div className="text-xs text-gray-600">
                              {new Date(meeting.date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                            {meeting.attendees && meeting.attendees.length > 0 && (
                              <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                                <User className="h-3 w-3" />
                                {meeting.attendees.join(', ')}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center text-sm text-gray-500 py-8">No records found</div>
                  )}
                </div>

                {/* Open Calls */}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Phone className="h-4 w-4" />
                    <h3 className="text-sm font-semibold">Open Calls</h3>
                    <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">0</span>
                  </div>
                  <div className="text-center text-sm text-gray-500 py-8">No records found</div>
                </div>
              </div>
            </div>

            {/* Closed Activities Section */}
            <div className="bg-white border rounded-lg">
              <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                <h2 className="text-base font-semibold">Closed Activities</h2>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-8">Column View</Button>
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0">⋮</Button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-0 divide-x">
                {/* Closed Tasks */}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckSquare className="h-4 w-4" />
                    <h3 className="text-sm font-semibold">Closed Tasks</h3>
                    <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">{propertyTasks?.filter((t: any) => t.status === 'Completed').length || 0}</span>
                  </div>
                  {propertyTasks && propertyTasks.filter((t: any) => t.status === 'Completed').length > 0 ? (
                    <div className="space-y-4">
                      {propertyTasks
                        .filter((t: any) => t.status === 'Completed')
                        .slice(0, 10)
                        .map((task: any) => (
                          <div key={task._id} className="pb-3 border-b last:border-0">
                            <div 
                              className="text-sm font-medium text-blue-600 hover:underline cursor-pointer mb-1"
                              onClick={() => router.push(`/dashboard/tasks/${task._id}`)}
                            >
                              {task.title}
                            </div>
                            <div className="text-xs text-gray-600">
                              {task.completedAt && new Date(task.completedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </div>
                            {task.assignedTo && (
                              <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                                <User className="h-3 w-3" />
                                {task.assignedTo.name}
                              </div>
                            )}
                            <div className="text-xs text-gray-600 mt-1">
                              Closed Time: {task.completedAt ? new Date(task.completedAt).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : '-'}
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center text-sm text-gray-500 py-8">No records found</div>
                  )}
                </div>

                {/* Closed Meetings */}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="h-4 w-4" />
                    <h3 className="text-sm font-semibold">Closed Meetings</h3>
                    <span 
                      className="text-xs bg-gray-200 px-2 py-0.5 rounded-full cursor-pointer hover:bg-gray-300"
                      onClick={() => setClosedMeetingsExpanded(!closedMeetingsExpanded)}
                      title="Click to expand/collapse"
                    >
                      {property.meetings?.filter((m: any) => new Date(m.date) < new Date()).length || 0}
                    </span>
                  </div>
                  {property.meetings && property.meetings.filter((m: any) => new Date(m.date) < new Date()).length > 0 ? (
                    <div className="space-y-4">
                      {property.meetings
                        .filter((m: any) => new Date(m.date) < new Date())
                        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .slice(0, closedMeetingsExpanded ? undefined : 2)
                        .map((meeting: any, idx: number) => (
                          <div key={idx} className="pb-3 border-b last:border-0">
                            <div className="text-sm font-medium text-blue-600 mb-1">{meeting.title}</div>
                            <div className="text-xs text-gray-600">
                              {new Date(meeting.date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                            {meeting.attendees && meeting.attendees.length > 0 && (
                              <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                                <User className="h-3 w-3" />
                                {meeting.attendees[0]}
                              </div>
                            )}
                            {meeting.aiNotes && (
                              <div className="mt-2">
                                <span className="text-xs font-medium text-gray-700">Description:</span>
                                <div className="text-xs text-gray-600 line-clamp-2 mt-0.5">{meeting.aiNotes.substring(0, 100)}...</div>
                                <Button
                                  size="sm"
                                  variant="link"
                                  className="h-auto p-0 text-xs text-blue-600 mt-1"
                                  onClick={() => {
                                    setSelectedMeetingForView(meeting);
                                    setViewMeetingNotesDialogOpen(true);
                                  }}
                                >
                                  Read More
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center text-sm text-gray-500 py-8">No records found</div>
                  )}
                </div>

                {/* Closed Calls */}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Phone className="h-4 w-4" />
                    <h3 className="text-sm font-semibold">Closed Calls</h3>
                    <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">0</span>
                  </div>
                  <div className="text-center text-sm text-gray-500 py-8">No records found</div>
                </div>
              </div>
            </div>

          {/* Products Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Products</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">For future use</p>
            </CardContent>
          </Card>

          {/* Desk Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Desk</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">For future use</p>
            </CardContent>
          </Card>

          {/* Property Visits Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Property Visits</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">For future use</p>
            </CardContent>
          </Card>

          {/* QA Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">QA</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">For future use</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <PropertyDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        property={property}
      />

      {/* Contact Dialog */}
      <ContactDialog
        open={contactDialogOpen}
        onClose={() => {
          setContactDialogOpen(false);
          queryClient.invalidateQueries({ queryKey: ['property', id] });
        }}
        propertyId={id}
      />

      {/* Gmail Composer */}
      <GmailComposer
        isOpen={sendEmailDialogOpen}
        onClose={() => {
          setSendEmailDialogOpen(false);
          setReplyTo('');
          setReplySubject('');
          setReplyBody('');
        }}
        propertyId={id}
        defaultTo={replyTo || property?.email || ''}
        defaultSubject={replySubject}
        defaultBody={replyBody}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['property', id] });
        }}
      />

      {/* Task Dialog */}
      <TaskDialog
        open={taskDialogOpen}
        onClose={() => setTaskDialogOpen(false)}
        propertyId={id}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
          queryClient.invalidateQueries({ queryKey: ['tasks', 'property', id] });
        }}
      />

      {/* Meeting Dialog */}
      <MeetingDialog
        open={meetingDialogOpen}
        onClose={() => setMeetingDialogOpen(false)}
        propertyId={id}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['property', id] });
        }}
      />

      {/* View Meeting Notes Dialog - Full Screen */}
      <Dialog open={viewMeetingNotesDialogOpen} onOpenChange={setViewMeetingNotesDialogOpen}>
        <DialogContent className="max-w-[95vw] w-full h-[95vh] max-h-[95vh] p-0 flex flex-col">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Calendar className="h-6 w-6 text-blue-500" />
              {selectedMeetingForView?.title}
            </DialogTitle>
            <div className="text-sm text-muted-foreground">
              {selectedMeetingForView && new Date(selectedMeetingForView.date).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="max-w-5xl mx-auto space-y-6">
              {selectedMeetingForView?.attendees && selectedMeetingForView.attendees.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm font-semibold mb-2 text-blue-900">Attendees:</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedMeetingForView.attendees.map((email: string, idx: number) => (
                      <span key={idx} className="text-sm bg-white text-blue-700 px-3 py-1.5 rounded-full border border-blue-200">
                        {email}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedMeetingForView?.meetLink && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm font-semibold mb-2 text-green-900">Meeting Link:</div>
                  <a 
                    href={selectedMeetingForView.meetLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-green-700 hover:text-green-800 hover:underline break-all"
                  >
                    {selectedMeetingForView.meetLink}
                  </a>
                </div>
              )}

              <div>
                <div className="text-lg font-semibold mb-3 flex items-center justify-between">
                  <span>Meeting Notes & Transcript</span>
                  {selectedMeetingForView?.aiNotes?.includes('https://docs.google.com') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const match = selectedMeetingForView.aiNotes.match(/(https:\/\/docs\.google\.com[^\s\n]+)/);
                        if (match) window.open(match[1], '_blank');
                      }}
                    >
                      Open in Google Docs
                    </Button>
                  )}
                </div>
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                  {selectedMeetingForView?.aiNotes ? (
                    <div className="prose prose-sm max-w-none">
                      <div className="text-sm whitespace-pre-wrap leading-relaxed font-mono">
                        {selectedMeetingForView.aiNotes}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-12">
                      <div className="mb-4">No notes available for this meeting</div>
                      <Button
                        size="sm"
                        onClick={() => {
                          setViewMeetingNotesDialogOpen(false);
                          handleFetchMeetingTranscript(selectedMeetingForView?.calendarEventId, selectedMeetingForView?.title);
                        }}
                      >
                        🤖 Fetch AI Notes from Google Meet
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center gap-2 px-6 py-4 border-t bg-gray-50">
            <div>
              {!selectedMeetingForView?.aiNotes && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setViewMeetingNotesDialogOpen(false);
                    handleFetchMeetingTranscript(selectedMeetingForView?.calendarEventId, selectedMeetingForView?.title);
                  }}
                  className="bg-purple-50 hover:bg-purple-100 border-purple-200"
                >
                  🤖 Fetch AI Notes
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {selectedMeetingForView?.meetLink && (
                <Button 
                  variant="outline"
                  onClick={() => window.open(selectedMeetingForView.meetLink, '_blank')}
                >
                  Open in Google Meet
                </Button>
              )}
              <Button 
                onClick={() => {
                  setViewMeetingNotesDialogOpen(false);
                  setEditingMeetingIndex(selectedMeetingForView?.calendarEventId);
                  setMeetingNotes(selectedMeetingForView?.aiNotes || '');
                }}
              >
                Edit Notes
              </Button>
              <Button 
                variant="outline"
                onClick={() => setViewMeetingNotesDialogOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Note Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="note-content">Note Content</Label>
              <textarea
                id="note-content"
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Enter your note here..."
                className="w-full min-h-[150px] p-3 border rounded-md resize-y"
                disabled={savingNote}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setNoteDialogOpen(false);
                setNoteContent('');
              }}
              disabled={savingNote}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!noteContent.trim()) {
                  alert('Please enter a note');
                  return;
                }
                
                setSavingNote(true);
                try {
                  const res = await fetch(`/api/properties/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      notes: [
                        ...(property.notes || []),
                        {
                          content: noteContent,
                          createdAt: new Date().toISOString(),
                          createdBy: session?.user?.name || 'Unknown'
                        }
                      ]
                    }),
                  });
                  
                  if (!res.ok) throw new Error('Failed to add note');
                  
                  await queryClient.invalidateQueries({ queryKey: ['property', id] });
                  setNoteDialogOpen(false);
                  setNoteContent('');
                } catch (error) {
                  console.error('Error adding note:', error);
                  alert('Failed to add note');
                } finally {
                  setSavingNote(false);
                }
              }}
              disabled={savingNote}
            >
              {savingNote ? 'Saving...' : 'Save Note'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Management Change Dialog */}
      <Dialog open={managementChangeDialogOpen} onOpenChange={setManagementChangeDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Management Change</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Current Management Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-semibold mb-2">Current Management</h4>
              <div className="text-sm text-gray-700">
                <div><strong>Company:</strong> {property?.company?.name || 'None'}</div>
                {property?.propertyManager && (
                  <div><strong>Property Manager:</strong> {property.propertyManager.firstName} {property.propertyManager.lastName}</div>
                )}
                {property?.regionalManager && (
                  <div><strong>Regional Manager:</strong> {property.regionalManager.firstName} {property.regionalManager.lastName}</div>
                )}
              </div>
            </div>

            {/* New Management Company */}
            <div className="space-y-2">
              <Label htmlFor="new-company">New Management Company *</Label>
              <div className="relative">
                <Input
                  id="new-company"
                  value={newManagementCompany ? newManagementCompany.name : managementCompanySearch}
                  onChange={(e) => {
                    setManagementCompanySearch(e.target.value);
                    setNewManagementCompany(null);
                    setShowManagementCompanyDropdown(true);
                  }}
                  onFocus={() => setShowManagementCompanyDropdown(true)}
                  placeholder="Search for company or type to add new..."
                  className="w-full"
                  disabled={savingManagementChange}
                />
                {showManagementCompanyDropdown && managementCompanySearch && !newManagementCompany && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredCompanies.length > 0 ? (
                      filteredCompanies.slice(0, 10).map((company: any) => (
                        <div
                          key={company._id}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                          onClick={() => {
                            setNewManagementCompany(company);
                            setManagementCompanySearch(company.name);
                            setShowManagementCompanyDropdown(false);
                          }}
                        >
                          <div className="font-medium">{company.name}</div>
                        </div>
                      ))
                    ) : (
                      <div
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                        onClick={async () => {
                          // Quick add new company
                          const companyName = managementCompanySearch;
                          try {
                            const res = await fetch('/api/companies', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ name: companyName }),
                            });
                            if (res.ok) {
                              const newCompany = await res.json();
                              setNewManagementCompany(newCompany);
                              setManagementCompanySearch(newCompany.name);
                              setShowManagementCompanyDropdown(false);
                              await queryClient.invalidateQueries({ queryKey: ['companies'] });
                            }
                          } catch (error) {
                            console.error('Error creating company:', error);
                            alert('Failed to create company');
                          }
                        }}
                      >
                        <div className="text-blue-600 font-medium">+ Add "{managementCompanySearch}" as new company</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* New Property Manager */}
            <div className="space-y-2">
              <Label htmlFor="new-pm">New Property Manager</Label>
              <div className="relative">
                <Input
                  id="new-pm"
                  value={newPropertyManager ? `${newPropertyManager.firstName} ${newPropertyManager.lastName}` : propertyManagerSearch}
                  onChange={(e) => {
                    setPropertyManagerSearch(e.target.value);
                    setNewPropertyManager(null);
                    setShowPMDropdown(true);
                  }}
                  onFocus={() => setShowPMDropdown(true)}
                  placeholder="Search for contact or leave empty to add later..."
                  className="w-full"
                  disabled={savingManagementChange}
                />
                {showPMDropdown && propertyManagerSearch && !newPropertyManager && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredPropertyManagerContacts.length > 0 ? (
                      filteredPropertyManagerContacts.slice(0, 10).map((contact: any) => (
                        <div
                          key={contact._id}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                          onClick={() => {
                            setNewPropertyManager(contact);
                            setPropertyManagerSearch(`${contact.firstName} ${contact.lastName}`);
                            setShowPMDropdown(false);
                          }}
                        >
                          <div className="font-medium">{contact.firstName} {contact.lastName}</div>
                          {contact.email && <div className="text-xs text-gray-500">{contact.email}</div>}
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-500">
                        No contacts found. Use "Add Contact" button to create a new one.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* New Regional Manager */}
            <div className="space-y-2">
              <Label htmlFor="new-rm">New Regional Manager</Label>
              <div className="relative">
                <Input
                  id="new-rm"
                  value={newRegionalManager ? `${newRegionalManager.firstName} ${newRegionalManager.lastName}` : regionalManagerSearch}
                  onChange={(e) => {
                    setRegionalManagerSearch(e.target.value);
                    setNewRegionalManager(null);
                    setShowRMDropdown(true);
                  }}
                  onFocus={() => setShowRMDropdown(true)}
                  placeholder="Search for contact or leave empty to add later..."
                  className="w-full"
                  disabled={savingManagementChange}
                />
                {showRMDropdown && regionalManagerSearch && !newRegionalManager && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredContacts.length > 0 ? (
                      filteredContacts.slice(0, 10).map((contact: any) => (
                        <div
                          key={contact._id}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                          onClick={() => {
                            setNewRegionalManager(contact);
                            setRegionalManagerSearch(`${contact.firstName} ${contact.lastName}`);
                            setShowRMDropdown(false);
                          }}
                        >
                          <div className="font-medium">{contact.firstName} {contact.lastName}</div>
                          {contact.email && <div className="text-xs text-gray-500">{contact.email}</div>}
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-500">
                        No contacts found. Use "Add Contact" button to create a new one.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setContactDialogOpen(true)}
                className="w-full"
              >
                <User className="h-4 w-4 mr-1" />
                Quick Add Contact
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setManagementChangeDialogOpen(false);
                setNewManagementCompany(null);
                setNewPropertyManager(null);
                setNewRegionalManager(null);
                setManagementCompanySearch('');
                setPropertyManagerSearch('');
                setRegionalManagerSearch('');
              }}
              disabled={savingManagementChange}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!newManagementCompany) {
                  alert('Please select a new management company');
                  return;
                }

                setSavingManagementChange(true);
                try {
                  // Build change log entry
                  const changes: string[] = [];
                  
                  if (property.company?.name !== newManagementCompany.name) {
                    changes.push(`Management Company changed from "${property.company?.name || 'None'}" to "${newManagementCompany.name}"`);
                  }
                  
                  if (property.propertyManager && newPropertyManager?._id !== property.propertyManager._id) {
                    const oldPM = `${property.propertyManager.firstName} ${property.propertyManager.lastName}`;
                    const newPM = newPropertyManager ? `${newPropertyManager.firstName} ${newPropertyManager.lastName}` : 'None';
                    changes.push(`Property Manager changed from "${oldPM}" to "${newPM}"`);
                  } else if (!property.propertyManager && newPropertyManager) {
                    changes.push(`Property Manager set to "${newPropertyManager.firstName} ${newPropertyManager.lastName}"`);
                  }
                  
                  if (property.regionalManager && newRegionalManager?._id !== property.regionalManager._id) {
                    const oldRM = `${property.regionalManager.firstName} ${property.regionalManager.lastName}`;
                    const newRM = newRegionalManager ? `${newRegionalManager.firstName} ${newRegionalManager.lastName}` : 'None';
                    changes.push(`Regional Manager changed from "${oldRM}" to "${newRM}"`);
                  } else if (!property.regionalManager && newRegionalManager) {
                    changes.push(`Regional Manager set to "${newRegionalManager.firstName} ${newRegionalManager.lastName}"`);
                  }

                  const changeLogEntry = {
                    date: new Date().toISOString(),
                    changes,
                    uploadedBy: session?.user?.id
                  };

                  // Update property with new management info
                  const res = await fetch(`/api/properties/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      company: newManagementCompany._id,
                      propertyManager: newPropertyManager?._id || null,
                      regionalManager: newRegionalManager?._id || null,
                      changeLog: [
                        ...(property.changeLog || []),
                        changeLogEntry
                      ]
                    }),
                  });

                  if (!res.ok) throw new Error('Failed to update property');

                  await queryClient.invalidateQueries({ queryKey: ['property', id] });
                  setManagementChangeDialogOpen(false);
                  setNewManagementCompany(null);
                  setNewPropertyManager(null);
                  setNewRegionalManager(null);
                  setManagementCompanySearch('');
                  setPropertyManagerSearch('');
                  setRegionalManagerSearch('');
                  
                  alert('Management change recorded successfully');
                } catch (error) {
                  console.error('Error recording management change:', error);
                  alert('Failed to record management change');
                } finally {
                  setSavingManagementChange(false);
                }
              }}
              disabled={savingManagementChange || !newManagementCompany}
            >
              {savingManagementChange ? 'Saving...' : 'Save Management Change'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
