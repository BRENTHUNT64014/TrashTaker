'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DeskPage() {
  const [activeTab, setActiveTab] = useState('contracts');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Desk</h2>
          <p className="text-muted-foreground">Manage contracts and documents</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="contracts">Contracts</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>
          
          {activeTab === 'contracts' && (
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Contract
            </Button>
          )}
          {activeTab === 'documents' && (
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Upload Document
            </Button>
          )}
        </div>

        {/* CONTRACTS TAB */}
        <TabsContent value="contracts" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No contracts yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Get started by creating your first contract
                </p>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Contract
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DOCUMENTS TAB */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload documents to get started
                </p>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Upload Document
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
