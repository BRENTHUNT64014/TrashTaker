'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export default function CRMExportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Data Export</h2>
        <p className="text-muted-foreground">Export CRM data to Excel or CSV files</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Export Options</CardTitle>
          <CardDescription>
            Download your CRM data in various formats
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">Export Leads</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Download all leads as Excel file
              </p>
              <Button variant="outline" className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Export Leads
              </Button>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">Export Properties</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Download all properties as Excel file
              </p>
              <Button variant="outline" className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Export Properties
              </Button>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">Export Companies</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Download all companies as Excel file
              </p>
              <Button variant="outline" className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Export Companies
              </Button>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">Export Contacts</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Download all contacts as Excel file
              </p>
              <Button variant="outline" className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Export Contacts
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
