'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Building2, Mail, Phone, Globe, MapPin, Check, X } from 'lucide-react';

const COMPANY_TYPES = [
  'Management Company',
  'Vendor/Partner',
  'Waste Broker',
  'Owner/Asset Mgr/Developer',
  'Other'
];

export default function CompanyDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.id as string;
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  // Fetch company details
  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ['company', companyId],
    queryFn: async () => {
      const res = await fetch(`/api/companies/${companyId}`);
      if (!res.ok) throw new Error('Failed to fetch company');
      return res.json();
    },
  });

  // Fetch properties for this company
  const { data: properties = [], isLoading: propertiesLoading } = useQuery({
    queryKey: ['company-properties', companyId],
    queryFn: async () => {
      const res = await fetch(`/api/properties?company=${companyId}`);
      if (!res.ok) throw new Error('Failed to fetch properties');
      return res.json();
    },
  });

  // Fetch contacts for this company
  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ['company-contacts', companyId],
    queryFn: async () => {
      const res = await fetch(`/api/contacts?company=${companyId}`);
      if (!res.ok) throw new Error('Failed to fetch contacts');
      return res.json();
    },
  });

  const handleEditField = (field: string, currentValue: any) => {
    setEditingField(field);
    setEditValue(currentValue || '');
  };

  const handleSaveField = async (field: string) => {
    setIsSaving(true);
    try {
      let updateData: any;
      
      // Handle nested address fields
      if (field.startsWith('address.')) {
        const addressField = field.split('.')[1];
        updateData = {
          address: {
            ...company.address,
            [addressField]: editValue
          }
        };
      } else {
        updateData = { [field]: editValue };
      }

      const res = await fetch(`/api/companies/${companyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) throw new Error('Failed to update company');

      await queryClient.invalidateQueries({ queryKey: ['company', companyId] });
      setEditingField(null);
      setEditValue('');
    } catch (error) {
      console.error('Error updating company:', error);
      alert('Failed to update company');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  if (companyLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading company details...</div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">Company not found</h3>
        <Button onClick={() => router.back()} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <Button 
            variant="outline" 
            onClick={() => router.push('/dashboard/crm')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to CRM
          </Button>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{company.name}</h2>
            <p className="text-muted-foreground">{company.type || 'Management Company'}</p>
          </div>
        </div>
      </div>

      {/* Company Information Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Company Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Name */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Company Name</label>
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
                <p 
                  className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted"
                  onClick={() => handleEditField('name', company.name)}
                >
                  {company.name || 'Click to add'}
                </p>
              )}
            </div>

            {/* Company Type */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Company Type</label>
              {editingField === 'type' ? (
                <div className="flex items-center gap-2">
                  {editValue === 'Other' ? (
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      placeholder="Enter custom type"
                      className="h-8 text-sm"
                      disabled={isSaving}
                    />
                  ) : (
                    <Select value={editValue} onValueChange={setEditValue} disabled={isSaving}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPANY_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Button
                    size="sm"
                    onClick={() => handleSaveField('type')}
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
                <p 
                  className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted"
                  onClick={() => handleEditField('type', company.type || 'Management Company')}
                >
                  {company.type || 'Management Company'}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              {editingField === 'email' ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="email"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="h-8 text-sm"
                    disabled={isSaving}
                  />
                  <Button
                    size="sm"
                    onClick={() => handleSaveField('email')}
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
                <p 
                  className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted"
                  onClick={() => handleEditField('email', company.email)}
                >
                  {company.email || 'Click to add'}
                </p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Phone</label>
              {editingField === 'phone' ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="tel"
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
                <p 
                  className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted"
                  onClick={() => handleEditField('phone', company.phone)}
                >
                  {company.phone || 'Click to add'}
                </p>
              )}
            </div>

            {/* Website */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Website</label>
              {editingField === 'website' ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="url"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder="https://example.com"
                    className="h-8 text-sm"
                    disabled={isSaving}
                  />
                  <Button
                    size="sm"
                    onClick={() => handleSaveField('website')}
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
                <p 
                  className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted"
                  onClick={() => handleEditField('website', company.website)}
                >
                  {company.website ? (
                    <a 
                      href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {company.website}
                    </a>
                  ) : (
                    'Click to add'
                  )}
                </p>
              )}
            </div>

            {/* Address Line 1 */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Address Line 1</label>
              {editingField === 'address.street' ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="h-8 text-sm"
                    disabled={isSaving}
                  />
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
                <p 
                  className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted"
                  onClick={() => handleEditField('address.street', company.address?.street)}
                >
                  {company.address?.street || 'Click to add'}
                </p>
              )}
            </div>

            {/* City */}
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
                <p 
                  className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted"
                  onClick={() => handleEditField('address.city', company.address?.city)}
                >
                  {company.address?.city || 'Click to add'}
                </p>
              )}
            </div>

            {/* State */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">State</label>
              {editingField === 'address.state' ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="h-8 text-sm"
                    disabled={isSaving}
                  />
                  <Button
                    size="sm"
                    onClick={() => handleSaveField('address.state')}
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
                <p 
                  className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted"
                  onClick={() => handleEditField('address.state', company.address?.state)}
                >
                  {company.address?.state || 'Click to add'}
                </p>
              )}
            </div>

            {/* ZIP */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">ZIP</label>
              {editingField === 'address.zipCode' ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="h-8 text-sm"
                    disabled={isSaving}
                  />
                  <Button
                    size="sm"
                    onClick={() => handleSaveField('address.zipCode')}
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
                <p 
                  className="text-sm cursor-pointer hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-muted"
                  onClick={() => handleEditField('address.zipCode', company.address?.zipCode)}
                >
                  {company.address?.zipCode || 'Click to add'}
                </p>
              )}
            </div>
          </div>

          {company.notes && (
            <div className="pt-3 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
              <p className="text-xs whitespace-pre-wrap">{company.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Properties Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Properties ({properties.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {propertiesLoading ? (
            <div className="flex justify-center py-6">
              <div className="text-xs text-muted-foreground">Loading properties...</div>
            </div>
          ) : properties.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <MapPin className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-xs text-muted-foreground">No properties associated with this company</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs h-8">Property Name</TableHead>
                    <TableHead className="text-xs h-8">Street Address</TableHead>
                    <TableHead className="text-xs h-8">City</TableHead>
                    <TableHead className="text-xs h-8">State</TableHead>
                    <TableHead className="text-xs h-8">Zip</TableHead>
                    <TableHead className="text-xs h-8">County</TableHead>
                    <TableHead className="text-xs h-8">Units</TableHead>
                    <TableHead className="text-xs h-8">Status</TableHead>
                    <TableHead className="text-xs h-8">Phone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {properties.map((property: any) => (
                    <TableRow 
                      key={property._id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/dashboard/crm/properties/${property._id}`)}
                    >
                      <TableCell className="font-medium text-xs py-2">{property.name}</TableCell>
                      <TableCell className="text-xs py-2">{property.address?.street || '-'}</TableCell>
                      <TableCell className="text-xs py-2">{property.address?.city || '-'}</TableCell>
                      <TableCell className="text-xs py-2">{property.address?.state || '-'}</TableCell>
                      <TableCell className="text-xs py-2">{property.address?.zipCode || property.address?.zip || '-'}</TableCell>
                      <TableCell className="text-xs py-2">{property.county || '-'}</TableCell>
                      <TableCell className="text-xs py-2">{property.unitCount || '-'}</TableCell>
                      <TableCell className="py-2">
                        <span className="px-2 py-0.5 text-[10px] rounded-full bg-primary/10 text-primary">
                          {property.status || 'Lead'}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs py-2">{property.phone || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contacts Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Contacts ({contacts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {contactsLoading ? (
            <div className="flex justify-center py-6">
              <div className="text-xs text-muted-foreground">Loading contacts...</div>
            </div>
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Mail className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-xs text-muted-foreground">No contacts associated with this company</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs h-8">Name</TableHead>
                    <TableHead className="text-xs h-8">Title</TableHead>
                    <TableHead className="text-xs h-8">Property</TableHead>
                    <TableHead className="text-xs h-8">Email</TableHead>
                    <TableHead className="text-xs h-8">Phone</TableHead>
                    <TableHead className="text-xs h-8">Mobile</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact: any) => (
                    <TableRow 
                      key={contact._id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/dashboard/crm/contacts/${contact._id}`)}
                    >
                      <TableCell className="font-medium text-xs py-2">
                        {contact.firstName} {contact.lastName}
                      </TableCell>
                      <TableCell className="text-xs py-2">{contact.title || '-'}</TableCell>
                      <TableCell className="text-xs py-2">
                        {contact.property?.name || '-'}
                      </TableCell>
                      <TableCell className="text-xs py-2">{contact.email || '-'}</TableCell>
                      <TableCell className="text-xs py-2">{contact.phone || '-'}</TableCell>
                      <TableCell className="text-xs py-2">{contact.mobile || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          {editingField === 'notes' ? (
            <div className="space-y-2">
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full min-h-[120px] px-3 py-2 text-sm rounded-md border border-input bg-background"
                disabled={isSaving}
                placeholder="Add notes about this company..."
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleSaveField('notes')}
                  disabled={isSaving}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div 
              className="cursor-pointer hover:bg-muted/50 rounded p-3 transition-colors min-h-[60px]"
              onClick={() => handleEditField('notes', company.notes)}
            >
              {company.notes ? (
                <p className="text-sm whitespace-pre-wrap">{company.notes}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Click to add notes...</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
