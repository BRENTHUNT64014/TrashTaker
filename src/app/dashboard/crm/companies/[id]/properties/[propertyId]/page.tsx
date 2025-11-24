'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, ArrowLeft, Mail, Phone, User } from 'lucide-react';
import { ContactDialog } from '@/components/crm/contact-dialog';

export default function PropertyContactsPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.id as string;
  const propertyId = params.propertyId as string;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);

  const { data: property } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: async () => {
      const res = await fetch(`/api/properties/${propertyId}`);
      if (!res.ok) throw new Error('Failed to fetch property');
      return res.json();
    },
  });

  const { data: contacts, isLoading } = useQuery({
    queryKey: ['contacts', propertyId],
    queryFn: async () => {
      const res = await fetch(`/api/contacts?property=${propertyId}`);
      if (!res.ok) throw new Error('Failed to fetch contacts');
      return res.json();
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <Button
          variant="ghost"
          onClick={() => router.push(`/dashboard/crm/companies/${companyId}`)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Properties
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{property?.name}</h1>
            <p className="text-muted-foreground">Contacts</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Contact
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading contacts...</p>
        </div>
      ) : contacts?.length === 0 ? (
        <Card className="p-12 text-center">
          <User className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No contacts found</h3>
          <p className="text-muted-foreground">Add contacts for this property</p>
          <Button onClick={() => setDialogOpen(true)} className="mt-4">
            <Plus className="mr-2 h-4 w-4" />
            Add Contact
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contacts?.map((contact: any) => (
            <Card
              key={contact._id}
              className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => {
                setSelectedContact(contact);
                setDialogOpen(true);
              }}
            >
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold">
                    {contact.firstName} {contact.lastName}
                  </h3>
                  {contact.title && (
                    <p className="text-sm text-muted-foreground">{contact.title}</p>
                  )}
                </div>

                <div className="space-y-1">
                  {contact.email && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Mail className="mr-2 h-4 w-4" />
                      {contact.email}
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Phone className="mr-2 h-4 w-4" />
                      {contact.phone}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ContactDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedContact(null);
        }}
        contact={selectedContact}
        companyId={companyId}
        propertyId={propertyId}
      />
    </div>
  );
}
