'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';

const propertySchema = z.object({
  // Required fields
  name: z.string().min(1, 'Property name is required'),
  company: z.string().min(1, 'Company is required'),
  unitCount: z.number().min(1, 'Unit count must be at least 1'),
  
  // Optional fields from Excel import
  alnId: z.string().optional(),
  phone: z.string().optional(),
  officeEmail: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  county: z.string().optional(),
  latitude: z.number().optional().or(z.nan()),
  longitude: z.number().optional().or(z.nan()),
  alnPriceClass: z.string().optional(),
  propType: z.string().optional(),
  feeManaged: z.string().optional(),
  ownerName: z.string().optional(),
  areaSupervisor: z.string().optional(),
  propertyManager: z.string().optional(),
  regionalManager: z.string().optional(),
  status: z.string().min(1, 'Status is required'),
});

type PropertyFormData = z.infer<typeof propertySchema>;

const quickCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
});

type QuickCompanyFormData = z.infer<typeof quickCompanySchema>;

const quickContactSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  company: z.string().optional(),
});

type QuickContactFormData = z.infer<typeof quickContactSchema>;

interface PropertyDialogProps {
  open: boolean;
  onClose: () => void;
  property?: any;
  companyId?: string;
}

export function PropertyDialog({ open, onClose, property, companyId }: PropertyDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [companySearch, setCompanySearch] = useState('');
  const [showQuickCompany, setShowQuickCompany] = useState(false);
  const [regionalManagerOpen, setRegionalManagerOpen] = useState(false);
  const [regionalManagerSearch, setRegionalManagerSearch] = useState('');
  const [showQuickRegionalManager, setShowQuickRegionalManager] = useState(false);
  const [propertyManagerOpen, setPropertyManagerOpen] = useState(false);
  const [propertyManagerSearch, setPropertyManagerSearch] = useState('');
  const [showQuickPropertyManager, setShowQuickPropertyManager] = useState(false);
  const queryClient = useQueryClient();

  // Fetch companies for dropdown
  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const res = await fetch('/api/companies');
      if (!res.ok) throw new Error('Failed to fetch companies');
      return res.json();
    },
  });

  // Fetch contacts for dropdowns
  const { data: contacts } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const res = await fetch('/api/contacts');
      if (!res.ok) throw new Error('Failed to fetch contacts');
      return res.json();
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      unitCount: 1,
      status: 'Lead',
    },
  });

  // Quick add company form
  const {
    register: registerCompany,
    handleSubmit: handleSubmitCompany,
    reset: resetCompany,
    formState: { errors: companyErrors },
  } = useForm<QuickCompanyFormData>({
    resolver: zodResolver(quickCompanySchema),
  });

  // Quick add contact forms
  const {
    register: registerRegionalManager,
    handleSubmit: handleSubmitRegionalManager,
    reset: resetRegionalManager,
    setValue: setValueRegionalManager,
    watch: watchRegionalManager,
    formState: { errors: regionalManagerErrors },
  } = useForm<QuickContactFormData>({
    resolver: zodResolver(quickContactSchema),
  });

  const {
    register: registerPropertyManager,
    handleSubmit: handleSubmitPropertyManager,
    reset: resetPropertyManager,
    setValue: setValuePropertyManager,
    watch: watchPropertyManager,
    formState: { errors: propertyManagerErrors },
  } = useForm<QuickContactFormData>({
    resolver: zodResolver(quickContactSchema),
  });

  useEffect(() => {
    if (property) {
      reset({
        name: property.name,
        company: property.company?._id || property.company,
        alnId: property.alnId || '',
        phone: property.phone || '',
        officeEmail: property.officeEmail || '',
        address: property.address?.street || '',
        city: property.address?.city || '',
        state: property.address?.state || '',
        zip: property.address?.zip || '',
        county: property.county || '',
        latitude: property.location?.coordinates?.[1] || undefined,
        longitude: property.location?.coordinates?.[0] || undefined,
        alnPriceClass: property.alnPriceClass || '',
        propType: property.propType || '',
        feeManaged: property.feeManaged || '',
        unitCount: property.unitCount,
        ownerName: property.ownerName || '',
        areaSupervisor: property.areaSupervisor || '',
        regionalManager: property.regionalManager?._id || property.regionalManager || '',
        propertyManager: property.propertyManager?._id || property.propertyManager || '',
        status: property.status || 'Lead',
      });
    } else {
      reset({
        company: companyId || '',
        unitCount: 1,
        status: 'Lead',
      });
    }
  }, [property, companyId, reset]);

  const onSubmitQuickCompany = async (data: QuickCompanyFormData) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email || undefined,
          phone: data.phone || undefined,
          type: 'Management Company',
          address: { street: '', city: '', state: '', zip: '' },
        }),
      });

      if (!res.ok) throw new Error('Failed to create company');

      const newCompany = await res.json();
      await queryClient.invalidateQueries({ queryKey: ['companies'] });
      
      setValue('company', newCompany._id);
      setShowQuickCompany(false);
      resetCompany();
      setCompanySearch('');
    } catch (error) {
      console.error('Error creating company:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitQuickRegionalManager = async (data: QuickContactFormData) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email || undefined,
          phone: data.phone || undefined,
          mobile: data.mobile || undefined,
          company: data.company || undefined,
          title: 'Regional Manager',
        }),
      });

      if (!res.ok) throw new Error('Failed to create contact');

      const newContact = await res.json();
      await queryClient.invalidateQueries({ queryKey: ['contacts'] });
      
      setValue('regionalManager', newContact._id);
      setShowQuickRegionalManager(false);
      resetRegionalManager();
      setRegionalManagerSearch('');
    } catch (error) {
      console.error('Error creating contact:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitQuickPropertyManager = async (data: QuickContactFormData) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email || undefined,
          phone: data.phone || undefined,
          mobile: data.mobile || undefined,
          company: data.company || undefined,
          title: 'Property Manager',
        }),
      });

      if (!res.ok) throw new Error('Failed to create contact');

      const newContact = await res.json();
      await queryClient.invalidateQueries({ queryKey: ['contacts'] });
      
      setValue('propertyManager', newContact._id);
      setShowQuickPropertyManager(false);
      resetPropertyManager();
      setPropertyManagerSearch('');
    } catch (error) {
      console.error('Error creating contact:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: PropertyFormData) => {
    setIsLoading(true);
    try {
      console.log('Submitting property data:', data);
      const url = property ? `/api/properties/${property._id}` : '/api/properties';
      const method = property ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.error || 'Failed to save property');
      }

      queryClient.invalidateQueries({ queryKey: ['properties'] });
      onClose();
    } catch (error) {
      console.error('Error saving property:', error);
      alert(error instanceof Error ? error.message : 'Failed to save property');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCompanies = companies?.filter((company: any) =>
    company.name.toLowerCase().includes(companySearch.toLowerCase())
  ) || [];

  const filteredRegionalManagers = contacts?.filter((contact: any) =>
    `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(regionalManagerSearch.toLowerCase())
  ) || [];

  const filteredPropertyManagers = contacts?.filter((contact: any) =>
    `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(propertyManagerSearch.toLowerCase())
  ) || [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{property ? 'Edit Lead' : 'Add Lead'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Property Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Property Name *</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          {/* Management Company with Quick Add */}
          <div className="space-y-2">
            <Label>Management Company *</Label>
            {!showQuickCompany ? (
              <Popover open={companyOpen} onOpenChange={setCompanyOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={companyOpen}
                    className="w-full justify-between"
                  >
                    {watch('company')
                      ? companies?.find((c: any) => c._id === watch('company'))?.name
                      : 'Search or select company...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput 
                      placeholder="Type to search companies..." 
                      value={companySearch}
                      onValueChange={setCompanySearch}
                    />
                    <CommandList>
                      <CommandEmpty>
                        <div className="p-2 text-center">
                          <p className="text-sm text-muted-foreground mb-2">No company found</p>
                          <Button
                            size="sm"
                            onClick={() => {
                              setShowQuickCompany(true);
                              setCompanyOpen(false);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Quick Add Company
                          </Button>
                        </div>
                      </CommandEmpty>
                      <CommandGroup>
                        {filteredCompanies.map((company: any) => (
                          <CommandItem
                            key={company._id}
                            value={company.name}
                            onSelect={() => {
                              setValue('company', company._id);
                              setCompanyOpen(false);
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                watch('company') === company._id ? 'opacity-100' : 'opacity-0'
                              }`}
                            />
                            {company.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            ) : (
              <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">Quick Add Company</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowQuickCompany(false);
                      resetCompany();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quick-company-name">Company Name *</Label>
                  <Input id="quick-company-name" {...registerCompany('name')} />
                  {companyErrors.name && (
                    <p className="text-sm text-destructive">{companyErrors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quick-company-email">Email</Label>
                  <Input id="quick-company-email" type="email" {...registerCompany('email')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quick-company-phone">Phone</Label>
                  <Input id="quick-company-phone" {...registerCompany('phone')} />
                </div>
                <Button
                  type="button"
                  onClick={handleSubmitCompany(onSubmitQuickCompany)}
                  disabled={isLoading}
                  className="w-full"
                >
                  Save & Associate
                </Button>
              </div>
            )}
            {errors.company && <p className="text-sm text-destructive">{errors.company.message}</p>}
          </div>

          {/* ALN Id */}
          <div className="space-y-2">
            <Label htmlFor="alnId">ALN Id</Label>
            <Input id="alnId" {...register('alnId')} placeholder="Unique identifier" />
          </div>

          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input id="phone" {...register('phone')} />
          </div>

          {/* Office Email */}
          <div className="space-y-2">
            <Label htmlFor="officeEmail">Office Email</Label>
            <Input id="officeEmail" type="email" {...register('officeEmail')} />
            {errors.officeEmail && <p className="text-sm text-destructive">{errors.officeEmail.message}</p>}
          </div>

          {/* Address Fields */}
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" {...register('address')} placeholder="Street address" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" {...register('city')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" {...register('state')} placeholder="TX" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">ZIP</Label>
              <Input id="zip" {...register('zip')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="county">County</Label>
            <Input id="county" {...register('county')} />
          </div>

          {/* Geolocation */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude</Label>
              <Input 
                id="latitude" 
                type="number" 
                step="any"
                {...register('latitude', { valueAsNumber: true })} 
                placeholder="29.7604"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude</Label>
              <Input 
                id="longitude" 
                type="number" 
                step="any"
                {...register('longitude', { valueAsNumber: true })} 
                placeholder="-95.3698"
              />
            </div>
          </div>

          {/* ALN Price Class */}
          <div className="space-y-2">
            <Label htmlFor="alnPriceClass">ALN Price Class</Label>
            <Input id="alnPriceClass" {...register('alnPriceClass')} />
          </div>

          {/* Property Type */}
          <div className="space-y-2">
            <Label htmlFor="propType">Property Type</Label>
            <Input id="propType" {...register('propType')} placeholder="e.g., Apartment, Condo" />
          </div>

          {/* Fee Managed */}
          <div className="space-y-2">
            <Label htmlFor="feeManaged">Fee Managed</Label>
            <Input id="feeManaged" {...register('feeManaged')} />
          </div>

          {/* Units */}
          <div className="space-y-2">
            <Label htmlFor="unitCount">Units *</Label>
            <Input 
              id="unitCount" 
              type="number" 
              {...register('unitCount', { valueAsNumber: true })} 
            />
            {errors.unitCount && <p className="text-sm text-destructive">{errors.unitCount.message}</p>}
          </div>

          {/* Owner Name */}
          <div className="space-y-2">
            <Label htmlFor="ownerName">Owner Name</Label>
            <Input id="ownerName" {...register('ownerName')} />
          </div>

          {/* Area Supervisor */}
          <div className="space-y-2">
            <Label htmlFor="areaSupervisor">Area Supervisor</Label>
            <Input id="areaSupervisor" {...register('areaSupervisor')} />
          </div>

          {/* Regional Manager with Quick Add */}
          <div className="space-y-2">
            <Label>Regional Manager</Label>
            {!showQuickRegionalManager ? (
              <Popover open={regionalManagerOpen} onOpenChange={setRegionalManagerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={regionalManagerOpen}
                    className="w-full justify-between"
                  >
                    {watch('regionalManager')
                      ? (() => {
                          const contact = contacts?.find((c: any) => c._id === watch('regionalManager'));
                          return contact ? `${contact.firstName} ${contact.lastName}` : 'Select contact...';
                        })()
                      : 'Search or select contact...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput 
                      placeholder="Type to search contacts..." 
                      value={regionalManagerSearch}
                      onValueChange={setRegionalManagerSearch}
                    />
                    <CommandList>
                      <CommandEmpty>
                        <div className="p-2 text-center">
                          <p className="text-sm text-muted-foreground mb-2">No contact found</p>
                          <Button
                            size="sm"
                            onClick={() => {
                              setShowQuickRegionalManager(true);
                              setRegionalManagerOpen(false);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Quick Create Contact
                          </Button>
                        </div>
                      </CommandEmpty>
                      <CommandGroup>
                        {filteredRegionalManagers.map((contact: any) => (
                          <CommandItem
                            key={contact._id}
                            value={`${contact.firstName} ${contact.lastName}`}
                            onSelect={() => {
                              setValue('regionalManager', contact._id);
                              setRegionalManagerOpen(false);
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                watch('regionalManager') === contact._id ? 'opacity-100' : 'opacity-0'
                              }`}
                            />
                            {contact.firstName} {contact.lastName}
                            {contact.email && <span className="text-muted-foreground text-sm ml-2">({contact.email})</span>}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            ) : (
              <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">Quick Create Contact</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowQuickRegionalManager(false);
                      resetRegionalManager();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="rm-firstName">First Name *</Label>
                    <Input id="rm-firstName" {...registerRegionalManager('firstName')} />
                    {regionalManagerErrors.firstName && (
                      <p className="text-sm text-destructive">{regionalManagerErrors.firstName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rm-lastName">Last Name *</Label>
                    <Input id="rm-lastName" {...registerRegionalManager('lastName')} />
                    {regionalManagerErrors.lastName && (
                      <p className="text-sm text-destructive">{regionalManagerErrors.lastName.message}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rm-email">Email</Label>
                  <Input id="rm-email" type="email" {...registerRegionalManager('email')} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="rm-phone">Phone</Label>
                    <Input id="rm-phone" {...registerRegionalManager('phone')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rm-mobile">Mobile</Label>
                    <Input id="rm-mobile" {...registerRegionalManager('mobile')} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Management Company</Label>
                  <Select
                    onValueChange={(value) => setValueRegionalManager('company', value)}
                    value={watchRegionalManager('company')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Search or select company..." />
                    </SelectTrigger>
                    <SelectContent>
                      {companies?.map((company: any) => (
                        <SelectItem key={company._id} value={company._id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  onClick={handleSubmitRegionalManager(onSubmitQuickRegionalManager)}
                  disabled={isLoading}
                  className="w-full"
                >
                  Save & Associate
                </Button>
              </div>
            )}
          </div>

          {/* Property Manager with Quick Add */}
          <div className="space-y-2">
            <Label>Property Manager</Label>
            {!showQuickPropertyManager ? (
              <Popover open={propertyManagerOpen} onOpenChange={setPropertyManagerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={propertyManagerOpen}
                    className="w-full justify-between"
                  >
                    {watch('propertyManager')
                      ? (() => {
                          const contact = contacts?.find((c: any) => c._id === watch('propertyManager'));
                          return contact ? `${contact.firstName} ${contact.lastName}` : 'Select contact...';
                        })()
                      : 'Search or select contact...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput 
                      placeholder="Type to search contacts..." 
                      value={propertyManagerSearch}
                      onValueChange={setPropertyManagerSearch}
                    />
                    <CommandList>
                      <CommandEmpty>
                        <div className="p-2 text-center">
                          <p className="text-sm text-muted-foreground mb-2">No contact found</p>
                          <Button
                            size="sm"
                            onClick={() => {
                              setShowQuickPropertyManager(true);
                              setPropertyManagerOpen(false);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Quick Create Contact
                          </Button>
                        </div>
                      </CommandEmpty>
                      <CommandGroup>
                        {filteredPropertyManagers.map((contact: any) => (
                          <CommandItem
                            key={contact._id}
                            value={`${contact.firstName} ${contact.lastName}`}
                            onSelect={() => {
                              setValue('propertyManager', contact._id);
                              setPropertyManagerOpen(false);
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                watch('propertyManager') === contact._id ? 'opacity-100' : 'opacity-0'
                              }`}
                            />
                            {contact.firstName} {contact.lastName}
                            {contact.email && <span className="text-muted-foreground text-sm ml-2">({contact.email})</span>}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            ) : (
              <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">Quick Create Contact</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowQuickPropertyManager(false);
                      resetPropertyManager();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="pm-firstName">First Name *</Label>
                    <Input id="pm-firstName" {...registerPropertyManager('firstName')} />
                    {propertyManagerErrors.firstName && (
                      <p className="text-sm text-destructive">{propertyManagerErrors.firstName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pm-lastName">Last Name *</Label>
                    <Input id="pm-lastName" {...registerPropertyManager('lastName')} />
                    {propertyManagerErrors.lastName && (
                      <p className="text-sm text-destructive">{propertyManagerErrors.lastName.message}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pm-email">Email</Label>
                  <Input id="pm-email" type="email" {...registerPropertyManager('email')} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="pm-phone">Phone</Label>
                    <Input id="pm-phone" {...registerPropertyManager('phone')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pm-mobile">Mobile</Label>
                    <Input id="pm-mobile" {...registerPropertyManager('mobile')} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Management Company</Label>
                  <Select
                    onValueChange={(value) => setValuePropertyManager('company', value)}
                    value={watchPropertyManager('company')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Search or select company..." />
                    </SelectTrigger>
                    <SelectContent>
                      {companies?.map((company: any) => (
                        <SelectItem key={company._id} value={company._id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  onClick={handleSubmitPropertyManager(onSubmitQuickPropertyManager)}
                  disabled={isLoading}
                  className="w-full"
                >
                  Save & Associate
                </Button>
              </div>
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select
              onValueChange={(value) => setValue('status', value)}
              defaultValue={watch('status')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Lead">Lead</SelectItem>
                <SelectItem value="Current Client">Current Client</SelectItem>
                <SelectItem value="Past Client">Past Client</SelectItem>
              </SelectContent>
            </Select>
            {errors.status && <p className="text-sm text-destructive">{errors.status.message}</p>}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : property ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
