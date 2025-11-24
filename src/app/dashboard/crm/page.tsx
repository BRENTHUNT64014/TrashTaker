'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Search, Building2, MapPin, User } from 'lucide-react';
import { CompanyDialog } from '@/components/crm/company-dialog';
import { PropertyDialog } from '@/components/properties/property-dialog';
import { ContactDialog } from '@/components/crm/contact-dialog';

export default function CRMPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('companies');
  const [companySearch, setCompanySearch] = useState('');
  const [propertySearch, setPropertySearch] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [propertyDialogOpen, setPropertyDialogOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  
  const queryClient = useQueryClient();

  const handleMassDelete = async (type: 'companies' | 'leads' | 'properties' | 'past-properties' | 'contacts') => {
    const confirmations = {
      'companies': 'Are you sure you want to delete ALL companies? This action cannot be undone.',
      'leads': 'Are you sure you want to delete ALL leads? This action cannot be undone.',
      'properties': 'Are you sure you want to delete ALL properties? This action cannot be undone.',
      'past-properties': 'Are you sure you want to delete ALL past properties? This action cannot be undone.',
      'contacts': 'Are you sure you want to delete ALL contacts? This action cannot be undone.',
    };

    if (!confirm(confirmations[type])) return;

    try {
      const endpoints = {
        'companies': '/api/companies/delete-all',
        'leads': '/api/properties/delete-all?status=Lead',
        'properties': '/api/properties/delete-all?status=Property',
        'past-properties': '/api/properties/delete-all?status=Past%20Property',
        'contacts': '/api/contacts/delete-all',
      };

      const res = await fetch(endpoints[type], { method: 'DELETE' });
      
      if (!res.ok) throw new Error('Delete failed');

      const data = await res.json();
      alert(`Successfully deleted ${data.deletedCount} ${type}`);

      // Invalidate relevant queries
      if (type === 'companies') {
        queryClient.invalidateQueries({ queryKey: ['companies'] });
      } else if (type === 'contacts') {
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['properties'] });
      }
    } catch (error) {
      alert(`Failed to delete ${type}`);
    }
  };

  // Fetch companies
  const { data: companies = [], isLoading: companiesLoading } = useQuery({
    queryKey: ['companies', companySearch],
    queryFn: async () => {
      const res = await fetch(`/api/companies?search=${companySearch}`);
      if (!res.ok) throw new Error('Failed to fetch companies');
      return res.json();
    },
  });

  // Fetch leads (status: Lead)
  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['properties', 'Lead', propertySearch],
    queryFn: async () => {
      const res = await fetch(`/api/properties?search=${propertySearch}&status=Lead`);
      if (!res.ok) throw new Error('Failed to fetch leads');
      return res.json();
    },
  });

  // Fetch properties (status: Current Client)
  const { data: properties = [], isLoading: propertiesLoading } = useQuery({
    queryKey: ['properties', 'Current Client', propertySearch],
    queryFn: async () => {
      const res = await fetch(`/api/properties?search=${propertySearch}&status=Current Client`);
      if (!res.ok) throw new Error('Failed to fetch properties');
      return res.json();
    },
  });

  // Fetch past properties (status: Past Client)
  const { data: pastProperties = [], isLoading: pastPropertiesLoading } = useQuery({
    queryKey: ['properties', 'Past Client', propertySearch],
    queryFn: async () => {
      const res = await fetch(`/api/properties?search=${propertySearch}&status=Past Client`);
      if (!res.ok) throw new Error('Failed to fetch past properties');
      return res.json();
    },
  });

  // Fetch contacts
  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ['contacts', contactSearch],
    queryFn: async () => {
      const res = await fetch(`/api/contacts?search=${contactSearch}`);
      if (!res.ok) throw new Error('Failed to fetch contacts');
      return res.json();
    },
  });

  return (
    <div className="flex flex-col h-full">
      {/* Top Navigation Bar */}
      <div className="border-b bg-white shadow-sm">
        <div className="flex items-center justify-between px-6 py-2">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-gray-900">CRM</h2>
            <nav className="flex gap-1">
              <button
                onClick={() => setActiveTab('companies')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                  activeTab === 'companies'
                    ? 'bg-[#03C066] text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Management Companies
              </button>
              <button
                onClick={() => setActiveTab('leads')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                  activeTab === 'leads'
                    ? 'bg-[#03C066] text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Leads
              </button>
              <button
                onClick={() => setActiveTab('properties')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                  activeTab === 'properties'
                    ? 'bg-[#03C066] text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Properties
              </button>
              <button
                onClick={() => setActiveTab('past-properties')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                  activeTab === 'past-properties'
                    ? 'bg-[#03C066] text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Past Properties
              </button>
              <button
                onClick={() => setActiveTab('contacts')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                  activeTab === 'contacts'
                    ? 'bg-[#03C066] text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Contacts
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                  activeTab === 'settings'
                    ? 'bg-[#03C066] text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Settings
              </button>
            </nav>
          </div>
          
          {activeTab === 'companies' && (
            <Button onClick={() => { setSelectedCompany(null); setCompanyDialogOpen(true); }}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Company
            </Button>
          )}
          {activeTab === 'leads' && (
            <Button onClick={() => { setSelectedProperty(null); setPropertyDialogOpen(true); }}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Lead
            </Button>
          )}
          {activeTab === 'contacts' && (
            <Button onClick={() => setContactDialogOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Contact
            </Button>
          )}
        </div>

        {/* COMPANIES TAB */}
        {activeTab === 'companies' && (
          <div className="space-y-4">
            <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search companies..."
                  value={companySearch}
                  onChange={(e) => setCompanySearch(e.target.value)}
                  className="pl-8"
                />
              </div>

              {companiesLoading ? (
                <div className="flex justify-center py-6">
                  <div className="text-xs text-muted-foreground">Loading companies...</div>
                </div>
              ) : companies.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Building2 className="h-8 w-8 text-muted-foreground mb-3" />
                  <h3 className="text-sm font-semibold">No companies found</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Get started by adding your first company
                  </p>
                  <Button onClick={() => { setSelectedCompany(null); setCompanyDialogOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Company
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader className="bg-[#03C066]">
                      <TableRow className="hover:bg-[#03C066]">
                        <TableHead className="text-xs h-10 font-bold text-white">Company Name</TableHead>
                        <TableHead className="text-xs h-10 font-bold text-white">Email</TableHead>
                        <TableHead className="text-xs h-10 font-bold text-white">Phone</TableHead>
                        <TableHead className="text-xs h-10 font-bold text-white">Location</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {companies.map((company: any, index: number) => (
                        <TableRow 
                          key={company._id}
                          className={`cursor-pointer hover:bg-muted/50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                          onClick={() => window.location.href = `/dashboard/crm/companies/${company._id}`}
                        >
                          <TableCell className="font-medium text-xs py-2">{company.name}</TableCell>
                          <TableCell className="text-xs py-2">{company.email || '-'}</TableCell>
                          <TableCell className="text-xs py-2">{company.phone || '-'}</TableCell>
                          <TableCell className="text-xs py-2">
                            {company.address
                              ? `${company.address.city}, ${company.address.state}`
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        )}

        {/* LEADS TAB */}
        {activeTab === 'leads' && (
          <div className="space-y-4">
            <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search leads..."
                  value={propertySearch}
                  onChange={(e) => setPropertySearch(e.target.value)}
                  className="pl-8"
                />
              </div>

              {leadsLoading ? (
                <div className="flex justify-center py-6">
                  <div className="text-xs text-muted-foreground">Loading leads...</div>
                </div>
              ) : leads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <MapPin className="h-8 w-8 text-muted-foreground mb-3" />
                  <h3 className="text-sm font-semibold">No leads found</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Get started by adding your first lead
                  </p>
                  <Button onClick={() => { setSelectedProperty(null); setPropertyDialogOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Lead
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader className="bg-[#03C066]">
                      <TableRow className="hover:bg-[#03C066]">
                        <TableHead className="text-xs h-10 font-bold text-white">Property Name</TableHead>
                        <TableHead className="text-xs h-10 font-bold text-white">Company</TableHead>
                        <TableHead className="text-xs h-10 font-bold text-white">Address</TableHead>
                        <TableHead className="text-xs h-10 font-bold text-white">Units</TableHead>
                        <TableHead className="text-xs h-10 font-bold text-white">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leads.map((property: any, index: number) => (
                        <TableRow 
                          key={property._id}
                          className={`cursor-pointer hover:bg-muted/50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                          onClick={() => window.location.href = `/dashboard/crm/properties/${property._id}`}
                        >
                          <TableCell className="font-medium text-xs py-2">{property.name}</TableCell>
                          <TableCell className="text-xs py-2">{property.company?.name || '-'}</TableCell>
                          <TableCell className="text-xs py-2">
                            {property.address
                              ? `${property.address.city}, ${property.address.state}`
                              : '-'}
                          </TableCell>
                          <TableCell className="text-xs py-2">{property.unitCount}</TableCell>
                          <TableCell className="py-2">
                            <span className="px-2 py-0.5 text-[10px] rounded-full bg-yellow-500/10 text-yellow-600">
                              {property.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        )}

        {/* PROPERTIES TAB */}
        {activeTab === 'properties' && (
          <div className="space-y-4">
            <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search properties..."
                  value={propertySearch}
                  onChange={(e) => setPropertySearch(e.target.value)}
                  className="pl-8"
                />
              </div>

              {propertiesLoading ? (
                <div className="flex justify-center py-6">
                  <div className="text-xs text-muted-foreground">Loading properties...</div>
                </div>
              ) : properties.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <MapPin className="h-8 w-8 text-muted-foreground mb-3" />
                  <h3 className="text-sm font-semibold">No properties found</h3>
                  <p className="text-xs text-muted-foreground">
                    Properties appear here when you convert a lead to Current Client
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader className="bg-[#03C066]">
                      <TableRow className="hover:bg-[#03C066]">
                        <TableHead className="text-xs h-10 font-bold text-white">Property Name</TableHead>
                        <TableHead className="text-xs h-10 font-bold text-white">Company</TableHead>
                        <TableHead className="text-xs h-10 font-bold text-white">Address</TableHead>
                        <TableHead className="text-xs h-10 font-bold text-white">Units</TableHead>
                        <TableHead className="text-xs h-10 font-bold text-white">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {properties.map((property: any, index: number) => (
                        <TableRow 
                          key={property._id}
                          className={`cursor-pointer hover:bg-muted/50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                          onClick={() => window.location.href = `/dashboard/crm/properties/${property._id}`}
                        >
                          <TableCell className="font-medium text-xs py-2">{property.name}</TableCell>
                          <TableCell className="text-xs py-2">{property.company?.name || '-'}</TableCell>
                          <TableCell className="text-xs py-2">
                            {property.address
                              ? `${property.address.city}, ${property.address.state}`
                              : '-'}
                          </TableCell>
                          <TableCell className="text-xs py-2">{property.unitCount}</TableCell>
                          <TableCell className="py-2">
                            <span className="px-2 py-0.5 text-[10px] rounded-full bg-primary/10 text-primary">
                              {property.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        )}

        {/* PAST PROPERTIES TAB */}
        {activeTab === 'past-properties' && (
          <div className="space-y-4">
            <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search past properties..."
                  value={propertySearch}
                  onChange={(e) => setPropertySearch(e.target.value)}
                  className="pl-8"
                />
              </div>

              {pastPropertiesLoading ? (
                <div className="flex justify-center py-6">
                  <div className="text-xs text-muted-foreground">Loading past properties...</div>
                </div>
              ) : pastProperties.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <MapPin className="h-8 w-8 text-muted-foreground mb-3" />
                  <h3 className="text-sm font-semibold">No past properties found</h3>
                  <p className="text-xs text-muted-foreground">
                    Properties marked as "Past Client" will appear here
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader className="bg-[#03C066]">
                      <TableRow className="hover:bg-[#03C066]">
                        <TableHead className="text-xs h-10 font-bold text-white">Property Name</TableHead>
                        <TableHead className="text-xs h-10 font-bold text-white">Company</TableHead>
                        <TableHead className="text-xs h-10 font-bold text-white">Address</TableHead>
                        <TableHead className="text-xs h-10 font-bold text-white">Units</TableHead>
                        <TableHead className="text-xs h-10 font-bold text-white">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pastProperties.map((property: any, index: number) => (
                        <TableRow 
                          key={property._id}
                          className={`cursor-pointer hover:bg-muted/50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                          onClick={() => window.location.href = `/dashboard/crm/properties/${property._id}`}
                        >
                          <TableCell className="font-medium text-xs py-2">{property.name}</TableCell>
                          <TableCell className="text-xs py-2">{property.company?.name || '-'}</TableCell>
                          <TableCell className="text-xs py-2">
                            {property.address
                              ? `${property.address.city}, ${property.address.state}`
                              : '-'}
                          </TableCell>
                          <TableCell className="text-xs py-2">{property.unitCount}</TableCell>
                          <TableCell className="py-2">
                            <span className="px-2 py-0.5 text-[10px] rounded-full bg-gray-500/10 text-gray-600">
                              {property.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        )}

        {/* CONTACTS TAB */}
        {activeTab === 'contacts' && (
          <div className="space-y-4">
            <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search contacts..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  className="pl-8"
                />
              </div>

              {contactsLoading ? (
                <div className="flex justify-center py-6">
                  <div className="text-xs text-muted-foreground">Loading contacts...</div>
                </div>
              ) : contacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <User className="h-8 w-8 text-muted-foreground mb-3" />
                  <h3 className="text-sm font-semibold">No contacts found</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Get started by adding your first contact
                  </p>
                  <Button onClick={() => setContactDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Contact
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader className="bg-[#03C066]">
                      <TableRow className="hover:bg-[#03C066]">
                        <TableHead className="text-xs h-10 font-bold text-white">Name</TableHead>
                        <TableHead className="text-xs h-10 font-bold text-white">Title</TableHead>
                        <TableHead className="text-xs h-10 font-bold text-white">Email</TableHead>
                        <TableHead className="text-xs h-10 font-bold text-white">Phone</TableHead>
                        <TableHead className="text-xs h-10 font-bold text-white">Company</TableHead>
                        <TableHead className="text-xs h-10 font-bold text-white">Property</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contacts.map((contact: any, index: number) => (
                        <TableRow 
                          key={contact._id}
                          className={`cursor-pointer hover:bg-muted/50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                          onClick={() => router.push(`/dashboard/crm/contacts/${contact._id}`)}
                        >
                          <TableCell className="font-medium text-xs py-2">
                            {contact.firstName} {contact.lastName}
                          </TableCell>
                          <TableCell className="text-xs py-2">{contact.title || '-'}</TableCell>
                          <TableCell className="text-xs py-2">{contact.email || '-'}</TableCell>
                          <TableCell className="text-xs py-2">{contact.phone || '-'}</TableCell>
                          <TableCell className="text-xs py-2">{contact.company?.name || '-'}</TableCell>
                          <TableCell className="text-xs py-2">{contact.property?.name || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="p-6">
          <Card>
            <CardContent className="p-6">
              {session?.user?.role !== 'ADMIN' ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Admin Access Required</h3>
                  <p className="text-sm text-muted-foreground">
                    You must be an administrator to access these settings.
                  </p>
                </div>
              ) : (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-bold mb-6">CRM Settings</h2>
                    <p className="text-sm text-muted-foreground mb-8">
                      Manage your CRM data. Use these tools carefully as mass deletions cannot be undone.
                    </p>
                  </div>

                  {/* Companies Delete Section */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-2">Delete All Companies</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Permanently delete all companies from the system. This action cannot be undone.
                    </p>
                    <Button 
                      variant="destructive"
                      onClick={() => handleMassDelete('companies')}
                    >
                      Delete All Companies
                    </Button>
                  </div>

                  {/* Leads Delete Section */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-2">Delete All Leads</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Permanently delete all properties with "Lead" status. This action cannot be undone.
                    </p>
                    <Button 
                      variant="destructive"
                      onClick={() => handleMassDelete('leads')}
                    >
                      Delete All Leads
                    </Button>
                  </div>

                  {/* Properties Delete Section */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-2">Delete All Properties</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Permanently delete all properties with "Property" status. This action cannot be undone.
                    </p>
                    <Button 
                      variant="destructive"
                      onClick={() => handleMassDelete('properties')}
                    >
                      Delete All Properties
                    </Button>
                  </div>

                  {/* Past Properties Delete Section */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-2">Delete All Past Properties</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Permanently delete all properties with "Past Property" status. This action cannot be undone.
                    </p>
                    <Button 
                      variant="destructive"
                      onClick={() => handleMassDelete('past-properties')}
                    >
                      Delete All Past Properties
                    </Button>
                  </div>

                  {/* Contacts Delete Section */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-2">Delete All Contacts</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Permanently delete all contacts from the system. This action cannot be undone.
                    </p>
                    <Button 
                      variant="destructive"
                      onClick={() => handleMassDelete('contacts')}
                    >
                      Delete All Contacts
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CompanyDialog
        open={companyDialogOpen}
        onOpenChange={setCompanyDialogOpen}
        company={selectedCompany}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['companies'] });
          setCompanyDialogOpen(false);
        }}
      />

      <PropertyDialog
        open={propertyDialogOpen}
        onClose={() => {
          setPropertyDialogOpen(false);
          setSelectedProperty(null);
        }}
        property={selectedProperty}
      />

      <ContactDialog
        open={contactDialogOpen}
        onClose={() => setContactDialogOpen(false)}
      />
    </div>
  );
}
