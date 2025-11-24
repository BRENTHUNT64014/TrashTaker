'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Plus, Search, Mail, Phone, User } from 'lucide-react';
import { ContactDialog } from '@/components/crm/contact-dialog';

interface Contact {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  title?: string;
  company?: {
    _id: string;
    name: string;
  };
  property?: {
    _id: string;
    name: string;
  };
}

export default function ContactsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: contacts, isLoading } = useQuery({
    queryKey: ['contacts', searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      
      const res = await fetch(`/api/contacts?${params}`);
      if (!res.ok) throw new Error('Failed to fetch contacts');
      return res.json();
    },
  });

  const handleClose = () => {
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contacts</h1>
          <p className="text-muted-foreground">Manage your business contacts</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Contact
        </Button>
      </div>

      <Card className="p-6">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading contacts...</p>
          </div>
        ) : contacts?.length === 0 ? (
          <div className="text-center py-12">
            <User className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No contacts found</h3>
            <p className="text-muted-foreground">Get started by adding your first contact</p>
            <Button onClick={() => setDialogOpen(true)} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Add Contact
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {contacts?.map((contact: Contact) => (
              <Card
                key={contact._id}
                className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => router.push(`/dashboard/crm/contacts/${contact._id}`)}
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

                  {contact.company && (
                    <p className="text-sm font-medium">{contact.company.name}</p>
                  )}

                  {contact.property && (
                    <p className="text-sm text-muted-foreground">{contact.property.name}</p>
                  )}

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
      </Card>

      <ContactDialog
        open={dialogOpen}
        onClose={handleClose}
      />
    </div>
  );
}
