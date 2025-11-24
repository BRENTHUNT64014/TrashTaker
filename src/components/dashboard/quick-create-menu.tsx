'use client';

import { useState } from 'react';
import { Plus, Building2, User, Phone, Calendar, FileText, CheckSquare, Users } from 'lucide-react';
import { ContactDialog } from '@/components/crm/contact-dialog';
import { PropertyDialog } from '@/components/properties/property-dialog';
import { CompanyDialog } from '@/components/crm/company-dialog';
import TaskDialog from '@/components/tasks/task-dialog';
import MeetingDialog from '@/components/meetings/meeting-dialog';
import { useRouter } from 'next/navigation';

export function QuickCreateMenu() {
  const router = useRouter();
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [propertyDialogOpen, setPropertyDialogOpen] = useState(false);
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);

  const menuItems = [
    { icon: Users, label: 'Contact', onClick: () => setContactDialogOpen(true) },
    { icon: Building2, label: 'Lead', onClick: () => setPropertyDialogOpen(true) },
    { icon: Building2, label: 'Company', onClick: () => setCompanyDialogOpen(true) },
    { icon: Calendar, label: 'Meeting', onClick: () => setMeetingDialogOpen(true) },
    { icon: Phone, label: 'Call', onClick: () => console.log('Create Call') },
    { icon: CheckSquare, label: 'Task', onClick: () => setTaskDialogOpen(true) },
    { icon: FileText, label: 'Deal', onClick: () => console.log('Create Deal') },
  ];

  const handleTaskSuccess = () => {
    router.refresh();
  };

  return (
    <>
      <div className="relative group">
        <button
          className="p-1.5 rounded bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="Quick create"
        >
          <Plus className="h-4 w-4 text-white" />
        </button>

        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={item.onClick}
                className={`flex items-center gap-3 px-4 py-2 text-sm w-full text-left text-gray-700 hover:bg-gray-50 transition-colors ${
                  index === 0 ? 'rounded-t-md' : index === menuItems.length - 1 ? 'rounded-b-md' : ''
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <ContactDialog
        open={contactDialogOpen}
        onClose={() => setContactDialogOpen(false)}
        contact={null}
      />
      <PropertyDialog
        open={propertyDialogOpen}
        onClose={() => setPropertyDialogOpen(false)}
        property={null}
      />
      <CompanyDialog
        open={companyDialogOpen}
        onClose={() => setCompanyDialogOpen(false)}
        company={null}
      />
      <TaskDialog
        open={taskDialogOpen}
        onClose={() => setTaskDialogOpen(false)}
        onSuccess={handleTaskSuccess}
      />
      <MeetingDialog
        open={meetingDialogOpen}
        onClose={() => setMeetingDialogOpen(false)}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}
