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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const contactSchema = z.object({
  firstName: z.string().optional().or(z.literal('')),
  lastName: z.string().optional().or(z.literal('')),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  title: z.string().optional(),
  company: z.string().optional(),
  property: z.string().optional(),
  notes: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface ContactDialogProps {
  open: boolean;
  onClose: () => void;
  contact?: any;
  companyId?: string;
  propertyId?: string;
}

export function ContactDialog({ open, onClose, contact, companyId, propertyId }: ContactDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [propertyOpen, setPropertyOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const queryClient = useQueryClient();

  // Fetch companies
  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const res = await fetch('/api/companies');
      if (!res.ok) throw new Error('Failed to fetch companies');
      return res.json();
    },
  });

  // Fetch properties
  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      const res = await fetch('/api/properties');
      if (!res.ok) throw new Error('Failed to fetch properties');
      return res.json();
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  useEffect(() => {
    if (open) {
      if (contact) {
        reset({
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email || '',
          phone: contact.phone || '',
          title: contact.title || '',
          company: contact.company?._id || '',
          property: contact.property?._id || '',
          notes: contact.notes || '',
        });
        setSelectedCompany(contact.company || null);
        setSelectedProperty(contact.property || null);
      } else {
        reset({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          title: '',
          company: companyId || '',
          property: propertyId || '',
          notes: '',
        });
        if (companyId && companies.length > 0) {
          const preSelectedCompany = companies.find((c: any) => c._id === companyId);
          setSelectedCompany(preSelectedCompany || null);
        }
        if (propertyId && properties.length > 0) {
          const preSelectedProperty = properties.find((p: any) => p._id === propertyId);
          setSelectedProperty(preSelectedProperty || null);
        }
      }
    }
  }, [open, contact, companyId, propertyId]);

  const onSubmit = async (data: ContactFormData) => {
    setIsLoading(true);
    try {
      const url = contact ? `/api/contacts/${contact._id}` : '/api/contacts';
      const method = contact ? 'PATCH' : 'POST';

      const payload = {
        ...data,
        company: selectedCompany?._id || '',
        property: selectedProperty?._id || '',
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        console.error('Error response:', error);
        throw new Error('Failed to save contact');
      }

      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      onClose();
    } catch (error) {
      console.error('Error saving contact:', error);
      alert('Failed to save contact. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{contact ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-xs">First Name</Label>
              <Input id="firstName" {...register('firstName')} className="text-sm h-9" />
              {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-xs">Last Name</Label>
              <Input id="lastName" {...register('lastName')} className="text-sm h-9" />
              {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title" className="text-xs">Title</Label>
            <Input id="title" {...register('title')} placeholder="e.g., Property Manager" className="text-sm h-9" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs">Email</Label>
              <Input id="email" type="email" {...register('email')} className="text-sm h-9" />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-xs">Phone</Label>
              <Input id="phone" type="tel" {...register('phone')} className="text-sm h-9" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company" className="text-xs">Company</Label>
              <Popover open={companyOpen} onOpenChange={setCompanyOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={companyOpen}
                    className="w-full justify-between text-sm h-9"
                  >
                    {selectedCompany ? selectedCompany.name : "Select company..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput 
                      placeholder="Search company..." 
                    />
                    <CommandList>
                      <CommandEmpty>No company found.</CommandEmpty>
                      <CommandGroup>
                        {companies.map((company: any) => (
                            <CommandItem
                              key={company._id}
                              value={company.name}
                              onSelect={() => {
                                setSelectedCompany(company);
                                setCompanyOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedCompany?._id === company._id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {company.name}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <input type="hidden" {...register('company')} value={selectedCompany?._id || ''} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="property" className="text-xs">Property</Label>
              <Popover open={propertyOpen} onOpenChange={setPropertyOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={propertyOpen}
                    className="w-full justify-between text-sm h-9"
                  >
                    {selectedProperty ? (selectedProperty.name || selectedProperty.propertyName) : "Select property..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput 
                      placeholder="Search property..." 
                    />
                    <CommandList>
                      <CommandEmpty>No property found.</CommandEmpty>
                      <CommandGroup>
                        {properties.map((property: any) => (
                            <CommandItem
                              key={property._id}
                              value={property.name || property.propertyName}
                              onSelect={() => {
                                setSelectedProperty(property);
                                setPropertyOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedProperty?._id === property._id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {property.name || property.propertyName}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <input type="hidden" {...register('property')} value={selectedProperty?._id || ''} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-xs">Notes</Label>
            <Textarea id="notes" {...register('notes')} rows={3} className="text-sm" />
          </div>

          <div className="flex justify-between gap-2">
            <div>
              {contact && selectedProperty && (
                <Button 
                  type="button" 
                  variant="destructive" 
                  onClick={() => {
                    setSelectedProperty(null);
                  }}
                >
                  Remove from Property
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : contact ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
