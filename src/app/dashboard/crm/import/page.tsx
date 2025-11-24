'use client';

import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';

export default function CRMImportPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [isUploadingCompanies, setIsUploadingCompanies] = useState(false);
  const [companyUploadResult, setCompanyUploadResult] = useState<any>(null);
  const [isUploadingContacts, setIsUploadingContacts] = useState(false);
  const [contactUploadResult, setContactUploadResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const companyFileInputRef = useRef<HTMLInputElement>(null);
  const contactFileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/leads/import', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to upload file');
      }

      const result = await res.json();
      setUploadResult(result);
      
      // Refresh leads list
      queryClient.invalidateQueries({ queryKey: ['properties', 'Lead'] });
      
      alert(`Import complete!\nCreated: ${result.created}\nUpdated: ${result.updated}${result.errors.length > 0 ? `\nErrors: ${result.errors.length}` : ''}`);
    } catch (error: any) {
      alert(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Data Import</h2>
        <p className="text-muted-foreground">Import leads and CRM data from Excel files</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ALN Lead Uploads</CardTitle>
          <CardDescription>
            Import leads from Excel files. The system will automatically create or update leads,
            companies, and contacts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                aria-label="Upload Excel file"
              />
              <Button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                size="lg"
              >
                <Upload className="mr-2 h-4 w-4" />
                {isUploading ? 'Uploading...' : 'Select Excel File to Import'}
              </Button>
            </div>

            {uploadResult && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <h4 className="text-sm font-semibold mb-2">Last Import Results</h4>
                <div className="text-sm space-y-1">
                  <p className="text-green-600">✓ Created: {uploadResult.created} leads</p>
                  <p className="text-blue-600">✓ Updated: {uploadResult.updated} leads</p>
                  {uploadResult.errors && uploadResult.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-destructive font-medium">Errors: {uploadResult.errors.length}</p>
                      <div className="mt-1 max-h-32 overflow-y-auto text-xs text-muted-foreground">
                        {uploadResult.errors.slice(0, 5).map((error: string, idx: number) => (
                          <p key={idx}>• {error}</p>
                        ))}
                        {uploadResult.errors.length > 5 && (
                          <p>... and {uploadResult.errors.length - 5} more</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="rounded-lg border bg-muted/20 p-4">
              <h4 className="text-sm font-semibold mb-2">Expected Excel Format</h4>
              <p className="text-xs text-muted-foreground mb-2">
                Your Excel file should contain the following columns:
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• ALN Id (required, unique identifier)</p>
                <p>• Property Name, Address, City, State, ZIP</p>
                <p>• Phone #, Property eMail Address</p>
                <p>• # Units, County, Latitude, Longitude</p>
                <p>• ALN Price Class, Prop Type, Fee Managed</p>
                <p>• Management Company details (name, address, phone)</p>
                <p>• Contacts: Area Supervisor, Area Supervisor Email, Manager</p>
                <p>• Owner Name</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Company Uploads</CardTitle>
          <CardDescription>
            Import companies from Excel files. The system will automatically create or update
            companies with their contact information and addresses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <input
                ref={companyFileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;

                  setIsUploadingCompanies(true);
                  setCompanyUploadResult(null);

                  try {
                    const formData = new FormData();
                    formData.append('file', file);

                    const res = await fetch('/api/companies/import', {
                      method: 'POST',
                      body: formData,
                    });

                    if (!res.ok) {
                      const error = await res.json();
                      throw new Error(error.error || 'Failed to upload file');
                    }

                    const result = await res.json();
                    setCompanyUploadResult(result);
                    
                    // Refresh companies list
                    queryClient.invalidateQueries({ queryKey: ['companies'] });
                    
                    alert(`Import complete!\nCreated: ${result.results.created}\nUpdated: ${result.results.updated}${result.results.errors.length > 0 ? `\nErrors: ${result.results.errors.length}` : ''}`);
                  } catch (error: any) {
                    alert(`Upload failed: ${error.message}`);
                  } finally {
                    setIsUploadingCompanies(false);
                    if (companyFileInputRef.current) {
                      companyFileInputRef.current.value = '';
                    }
                  }
                }}
                className="hidden"
                aria-label="Upload company Excel file"
              />
              <Button 
                onClick={() => companyFileInputRef.current?.click()}
                disabled={isUploadingCompanies}
                size="lg"
              >
                <Upload className="mr-2 h-4 w-4" />
                {isUploadingCompanies ? 'Uploading...' : 'Select Company Excel File to Import'}
              </Button>
            </div>

            {companyUploadResult && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <h4 className="text-sm font-semibold mb-2">Last Import Results</h4>
                <div className="text-sm space-y-1">
                  <p className="text-green-600">✓ Created: {companyUploadResult.results.created} companies</p>
                  <p className="text-blue-600">✓ Updated: {companyUploadResult.results.updated} companies</p>
                  {companyUploadResult.results.errors && companyUploadResult.results.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-destructive font-medium">Errors: {companyUploadResult.results.errors.length}</p>
                      <div className="mt-1 max-h-32 overflow-y-auto text-xs text-muted-foreground">
                        {companyUploadResult.results.errors.slice(0, 5).map((error: string, idx: number) => (
                          <p key={idx}>• {error}</p>
                        ))}
                        {companyUploadResult.results.errors.length > 5 && (
                          <p>... and {companyUploadResult.results.errors.length - 5} more</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="rounded-lg border bg-muted/20 p-4">
              <h4 className="text-sm font-semibold mb-2">Expected Excel Format</h4>
              <p className="text-xs text-muted-foreground mb-2">
                Your Excel file should contain the following columns:
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Mgmt Co Name (required)</p>
                <p>• Address1, Address2</p>
                <p>• City, State, ZIP</p>
                <p>• Phone #</p>
                <p>• URL (website)</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact Uploads</CardTitle>
          <CardDescription>
            Import contacts from Excel files. The system will check for existing contacts by first and last name,
            and update missing email/phone information. Last Verified date is automatically updated.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <input
                ref={contactFileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;

                  setIsUploadingContacts(true);
                  setContactUploadResult(null);

                  try {
                    const formData = new FormData();
                    formData.append('file', file);

                    const res = await fetch('/api/contacts/import', {
                      method: 'POST',
                      body: formData,
                    });

                    if (!res.ok) {
                      const error = await res.json();
                      throw new Error(error.error || 'Failed to upload file');
                    }

                    const result = await res.json();
                    setContactUploadResult(result);
                    
                    // Refresh contacts list
                    queryClient.invalidateQueries({ queryKey: ['contacts'] });
                    
                    alert(`Import complete!\nCreated: ${result.results.created}\nUpdated: ${result.results.updated}\nSkipped: ${result.results.skipped}${result.results.errors.length > 0 ? `\nErrors: ${result.results.errors.length}` : ''}`);
                  } catch (error: any) {
                    alert(`Upload failed: ${error.message}`);
                  } finally {
                    setIsUploadingContacts(false);
                    if (contactFileInputRef.current) {
                      contactFileInputRef.current.value = '';
                    }
                  }
                }}
                className="hidden"
                aria-label="Upload contact Excel file"
              />
              <Button 
                onClick={() => contactFileInputRef.current?.click()}
                disabled={isUploadingContacts}
                size="lg"
              >
                <Upload className="mr-2 h-4 w-4" />
                {isUploadingContacts ? 'Uploading...' : 'Select Contact Excel File to Import'}
              </Button>
            </div>

            {contactUploadResult && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <h4 className="text-sm font-semibold mb-2">Last Import Results</h4>
                <div className="text-sm space-y-1">
                  <p className="text-green-600">✓ Created: {contactUploadResult.results.created} contacts</p>
                  <p className="text-blue-600">✓ Updated: {contactUploadResult.results.updated} contacts</p>
                  <p className="text-gray-600">○ Skipped: {contactUploadResult.results.skipped} contacts</p>
                  {contactUploadResult.results.errors && contactUploadResult.results.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-destructive font-medium">Errors: {contactUploadResult.results.errors.length}</p>
                      <div className="mt-1 max-h-32 overflow-y-auto text-xs text-muted-foreground">
                        {contactUploadResult.results.errors.slice(0, 5).map((error: string, idx: number) => (
                          <p key={idx}>• {error}</p>
                        ))}
                        {contactUploadResult.results.errors.length > 5 && (
                          <p>... and {contactUploadResult.results.errors.length - 5} more</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="rounded-lg border bg-muted/20 p-4">
              <h4 className="text-sm font-semibold mb-2">Expected Excel Format</h4>
              <p className="text-xs text-muted-foreground mb-2">
                Your Excel file should contain the following columns:
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• First Name (required)</p>
                <p>• Last Name (required)</p>
                <p>• Title</p>
                <p>• Property</p>
                <p>• Management Company</p>
                <p>• Email</p>
                <p>• Phone Number</p>
              </div>
              <p className="text-xs text-muted-foreground mt-2 italic">
                Note: Contacts are matched by First Name + Last Name. Missing email/phone will be added if available.
                Last Verified date is automatically updated on each import.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
