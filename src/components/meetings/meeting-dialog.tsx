'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';

interface MeetingDialogProps {
  open: boolean;
  onClose: () => void;
  propertyId?: string;
  contactId?: string;
  onSuccess?: () => void;
}

export default function MeetingDialog({ open, onClose, propertyId, contactId, onSuccess }: MeetingDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState('30');
  const [selectedPropertyId, setSelectedPropertyId] = useState(propertyId || '');
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>(contactId ? [contactId] : []);
  const [attendeeEmail, setAttendeeEmail] = useState('');
  const [additionalAttendees, setAdditionalAttendees] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [propertySearch, setPropertySearch] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);

  // Fetch properties
  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      const res = await fetch('/api/properties');
      if (!res.ok) throw new Error('Failed to fetch properties');
      return res.json();
    },
    enabled: open,
  });

  // Fetch contacts
  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const res = await fetch('/api/contacts');
      if (!res.ok) throw new Error('Failed to fetch contacts');
      const data = await res.json();
      console.log('Loaded contacts:', data.length);
      return data;
    },
    enabled: open,
  });

  // Fetch specific property data if propertyId is provided
  const { data: selectedProperty } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: async () => {
      if (!propertyId) return null;
      const res = await fetch(`/api/properties/${propertyId}`);
      if (!res.ok) throw new Error('Failed to fetch property');
      return res.json();
    },
    enabled: open && !!propertyId,
  });

  // Initialize property and contacts when dialog opens with propertyId
  useEffect(() => {
    if (open && propertyId && selectedProperty) {
      setSelectedPropertyId(propertyId);
      setPropertySearch(selectedProperty.name || selectedProperty.propertyName || '');
      
      // Auto-select property contacts
      if (selectedProperty.contacts && selectedProperty.contacts.length > 0) {
        const propertyContactIds = selectedProperty.contacts.map((c: any) => 
          typeof c === 'string' ? c : c._id
        );
        setSelectedContactIds(propertyContactIds);
      }
    } else if (open && !propertyId) {
      // Reset when opening without propertyId
      setPropertySearch('');
      setSelectedPropertyId('');
      setSelectedContactIds([]);
    }
  }, [open, propertyId, selectedProperty]);

  // Filter properties based on search
  const filteredProperties = properties.filter((property: any) => {
    const searchLower = propertySearch.toLowerCase();
    const name = (property.name || property.propertyName || '').toLowerCase();
    const address = typeof property.address === 'string' ? property.address.toLowerCase() : '';
    return name.includes(searchLower) || address.includes(searchLower);
  });

  // Filter contacts based on search and selected property
  const filteredContacts = contacts.filter((contact: any) => {
    if (!contactSearch) return true; // Show all if no search
    
    const searchLower = contactSearch.toLowerCase();
    const firstName = (contact.firstName || '').toLowerCase();
    const lastName = (contact.lastName || '').toLowerCase();
    const email = (contact.email || '').toLowerCase();
    const fullName = `${firstName} ${lastName}`.toLowerCase();
    
    return firstName.includes(searchLower) || 
           lastName.includes(searchLower) || 
           fullName.includes(searchLower) ||
           email.includes(searchLower);
  });

  // Get selected property name for display
  const selectedPropertyName = selectedPropertyId && properties.length > 0
    ? properties.find((p: any) => p._id === selectedPropertyId)?.name || 
      properties.find((p: any) => p._id === selectedPropertyId)?.propertyName || ''
    : '';

  // Handle property selection from dropdown
  const handleSelectProperty = (property: any) => {
    setSelectedPropertyId(property._id);
    setPropertySearch(property.name || property.propertyName);
    setShowPropertyDropdown(false);
    
    // Auto-select property contacts
    if (property.contacts && property.contacts.length > 0) {
      const propertyContactIds = property.contacts.map((c: any) => 
        typeof c === 'string' ? c : c._id
      );
      setSelectedContactIds(propertyContactIds);
    }
  };

  // Handle clearing property selection
  const handleClearProperty = () => {
    setSelectedPropertyId('');
    setPropertySearch('');
    setShowPropertyDropdown(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (showPropertyDropdown) {
        setTimeout(() => setShowPropertyDropdown(false), 200);
      }
    };
    
    if (showPropertyDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showPropertyDropdown]);

  const handleAddAttendee = () => {
    if (attendeeEmail.trim() && !additionalAttendees.includes(attendeeEmail.trim())) {
      setAdditionalAttendees([...additionalAttendees, attendeeEmail.trim()]);
      setAttendeeEmail('');
    }
  };

  const handleRemoveAttendee = (email: string) => {
    setAdditionalAttendees(additionalAttendees.filter(e => e !== email));
  };

  const toggleContact = (contactId: string) => {
    if (selectedContactIds.includes(contactId)) {
      setSelectedContactIds(selectedContactIds.filter(id => id !== contactId));
    } else {
      setSelectedContactIds([...selectedContactIds, contactId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !startDate || !startTime) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const startDateTime = `${startDate}T${startTime}`;
      
      const res = await fetch('/api/calendar/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          startDateTime,
          duration: parseInt(duration),
          propertyId: selectedPropertyId || undefined,
          contactIds: selectedContactIds.length > 0 ? selectedContactIds : undefined,
          additionalAttendees: additionalAttendees.length > 0 ? additionalAttendees : undefined,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to schedule meeting');
      }

      alert('Meeting scheduled successfully! Calendar invite sent to attendees.');
      
      // Reset form
      setTitle('');
      setDescription('');
      setStartDate('');
      setStartTime('');
      setDuration('30');
      setSelectedPropertyId(propertyId || '');
      setSelectedContactIds(contactId ? [contactId] : []);
      setAdditionalAttendees([]);
      setPropertySearch('');
      setContactSearch('');
      setShowPropertyDropdown(false);
      
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error scheduling meeting:', error);
      alert(error instanceof Error ? error.message : 'Failed to schedule meeting');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Meeting</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Meeting Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Property Walkthrough"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Meeting agenda or notes..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div>
              <Label htmlFor="startTime">Time *</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="90">1.5 hours</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="property">Property (Optional)</Label>
            <div className="relative">
              <Input
                placeholder="Search properties..."
                value={propertySearch}
                onChange={(e) => {
                  setPropertySearch(e.target.value);
                  setShowPropertyDropdown(true);
                }}
                onFocus={() => setShowPropertyDropdown(true)}
                className={selectedPropertyId ? 'border-green-500' : ''}
              />
              {selectedPropertyId && (
                <button
                  type="button"
                  onClick={handleClearProperty}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title="Clear selection"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              {showPropertyDropdown && filteredProperties.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  <button
                    type="button"
                    onClick={handleClearProperty}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b text-sm text-gray-500"
                  >
                    None
                  </button>
                  {filteredProperties.map((property: any) => (
                    <button
                      key={property._id}
                      type="button"
                      onClick={() => handleSelectProperty(property)}
                      className={`w-full text-left px-4 py-2 hover:bg-gray-50 border-b last:border-b-0 ${
                        selectedPropertyId === property._id ? 'bg-green-50' : ''
                      }`}
                    >
                      <div className="font-medium text-sm">{property.name || property.propertyName}</div>
                      {property.address && typeof property.address === 'object' && (
                        <div className="text-xs text-gray-500">
                          {property.address.street}, {property.address.city}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedPropertyId && selectedPropertyName && (
              <div className="mt-1 text-xs text-green-600">
                ✓ Selected: {selectedPropertyName}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Contacts (Optional)</Label>
              {selectedContactIds.length > 0 && (
                <span className="text-xs text-green-600 font-medium">
                  {selectedContactIds.length} selected
                </span>
              )}
            </div>
            <div className="space-y-2">
              <Input
                placeholder="Search contacts..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
              />
              <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                {contactsLoading ? (
                  <div className="text-sm text-gray-500 text-center py-4">
                    Loading contacts...
                  </div>
                ) : filteredContacts.length > 0 ? (
                  filteredContacts.map((contact: any) => {
                    const isPropertyContact = selectedProperty?.contacts?.some((c: any) => 
                      (typeof c === 'string' ? c : c._id) === contact._id
                    );
                    return (
                      <label
                        key={contact._id}
                        className={`flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer ${
                          isPropertyContact ? 'bg-green-50 border border-green-200' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedContactIds.includes(contact._id)}
                          onChange={() => toggleContact(contact._id)}
                          className="h-4 w-4"
                        />
                        <div className="flex-1 text-sm">
                          <div className="font-medium flex items-center gap-2">
                            {contact.firstName} {contact.lastName}
                            {isPropertyContact && (
                              <span className="text-xs bg-green-600 text-white px-1.5 py-0.5 rounded">
                                Property Contact
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">{contact.email}</div>
                        </div>
                      </label>
                    );
                  })
                ) : (
                  <div className="text-sm text-gray-500 text-center py-4">
                    {contactSearch ? (
                      <div>
                        <div>No contacts match "{contactSearch}"</div>
                        <div className="text-xs mt-1">Total contacts loaded: {contacts.length}</div>
                      </div>
                    ) : (
                      'No contacts available'
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="attendeeEmail">Additional Attendees (Email)</Label>
            <div className="flex gap-2">
              <Input
                id="attendeeEmail"
                type="email"
                value={attendeeEmail}
                onChange={(e) => setAttendeeEmail(e.target.value)}
                placeholder="email@example.com"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddAttendee();
                  }
                }}
              />
              <Button type="button" onClick={handleAddAttendee} variant="outline">
                Add
              </Button>
            </div>
            {additionalAttendees.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {additionalAttendees.map((email) => (
                  <div
                    key={email}
                    className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => handleRemoveAttendee(email)}
                      className="hover:text-blue-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-[#03C066] hover:bg-[#02a055]">
              {saving ? 'Scheduling...' : 'Schedule Meeting'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
