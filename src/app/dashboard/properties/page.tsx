'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Plus, Search, MapPin, Building2 } from 'lucide-react';
import { PropertyDialog } from '@/components/properties/property-dialog';

interface Property {
  _id: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  company: {
    _id: string;
    name: string;
  };
  status: string;
  unitCount: number;
}

export default function PropertiesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  const { data: properties, isLoading } = useQuery({
    queryKey: ['properties', searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      
      const res = await fetch(`/api/properties?${params}`);
      if (!res.ok) throw new Error('Failed to fetch properties');
      return res.json();
    },
  });

  const handleEdit = (property: Property) => {
    setSelectedProperty(property);
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setSelectedProperty(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Properties</h1>
          <p className="text-muted-foreground">Manage property locations and details</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Property
        </Button>
      </div>

      <Card className="p-6">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search properties..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading properties...</p>
          </div>
        ) : properties?.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No properties found</h3>
            <p className="text-muted-foreground">Get started by adding your first property</p>
            <Button onClick={() => setDialogOpen(true)} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Add Property
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {properties?.map((property: Property) => (
              <Card
                key={property._id}
                className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleEdit(property)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold">{property.name}</h3>
                    <p className="text-sm text-muted-foreground">{property.company.name}</p>
                  </div>
                  <span className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">
                    {property.status}
                  </span>
                </div>
                <div className="mt-3 space-y-1">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="mr-2 h-4 w-4" />
                    {property.address.street}
                  </div>
                  <p className="text-sm text-muted-foreground ml-6">
                    {property.address.city}, {property.address.state} {property.address.zip}
                  </p>
                  <p className="text-sm font-medium mt-2">
                    {property.unitCount} units
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      <PropertyDialog
        open={dialogOpen}
        onClose={handleClose}
        property={selectedProperty}
      />
    </div>
  );
}
