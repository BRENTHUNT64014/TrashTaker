'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Plus, Search, Package } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface InventoryItem {
  _id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  reorderPoint: number;
  unitCost: number;
  supplier?: string;
}

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: items, isLoading } = useQuery({
    queryKey: ['inventory', searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      
      const res = await fetch(`/api/inventory?${params}`);
      if (!res.ok) throw new Error('Failed to fetch inventory');
      return res.json();
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory</h1>
          <p className="text-muted-foreground">Track containers, supplies, and equipment</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      </div>

      <Card className="p-6">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search inventory..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading inventory...</p>
          </div>
        ) : items?.length === 0 ? (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No items found</h3>
            <p className="text-muted-foreground">Get started by adding inventory items</p>
            <Button className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Reorder Point</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items?.map((item: InventoryItem) => (
                  <TableRow key={item._id}>
                    <TableCell className="font-medium">{item.sku}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{item.reorderPoint}</TableCell>
                    <TableCell className="text-right">${item.unitCost.toFixed(2)}</TableCell>
                    <TableCell>
                      {item.quantity <= item.reorderPoint ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-destructive/10 text-destructive">
                          Low Stock
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded-full bg-green-500/10 text-green-500">
                          In Stock
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
