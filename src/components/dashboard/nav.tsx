'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types/enums';
import {
  Building2,
  Users,
  MapPin,
  Package,
  FileText,
  TicketIcon,
  BarChart3,
  Settings,
  Home,
  Trash2,
  Laptop,
  ChevronRight,
  Download,
  Upload,
  Menu,
  X,
  MoreHorizontal,
  LogOut,
} from 'lucide-react';

interface SubMenuItem {
  title: string;
  href: string;
  roles: UserRole[];
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  submenu?: SubMenuItem[];
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    roles: [
      UserRole.ADMIN,
      UserRole.VP_SALES,
      UserRole.SALES_MANAGER,
      UserRole.SALES,
      UserRole.REGIONAL_DIRECTOR_OPS,
      UserRole.DISTRICT_SERVICE_MANAGER,
      UserRole.CLIENT,
      UserRole.COLLECTOR,
    ],
  },
  {
    title: 'Desk',
    href: '/dashboard/desk',
    icon: Laptop,
    roles: [
      UserRole.ADMIN,
      UserRole.VP_SALES,
      UserRole.SALES_MANAGER,
      UserRole.SALES,
      UserRole.REGIONAL_DIRECTOR_OPS,
    ],
  },
  {
    title: 'CRM',
    href: '/dashboard/crm',
    icon: Building2,
    roles: [
      UserRole.ADMIN,
      UserRole.VP_SALES,
      UserRole.SALES_MANAGER,
      UserRole.SALES,
      UserRole.REGIONAL_DIRECTOR_OPS,
    ],
    submenu: [
      {
        title: 'Data Import',
        href: '/dashboard/crm/import',
        roles: [UserRole.ADMIN],
      },
      {
        title: 'Data Export',
        href: '/dashboard/crm/export',
        roles: [UserRole.ADMIN],
      },
    ],
  },
  {
    title: 'Routes',
    href: '/dashboard/routes',
    icon: Trash2,
    roles: [
      UserRole.ADMIN,
      UserRole.REGIONAL_DIRECTOR_OPS,
      UserRole.DISTRICT_SERVICE_MANAGER,
      UserRole.COLLECTOR,
    ],
  },
  {
    title: 'Inventory',
    href: '/dashboard/inventory',
    icon: Package,
    roles: [UserRole.ADMIN, UserRole.REGIONAL_DIRECTOR_OPS, UserRole.DISTRICT_SERVICE_MANAGER],
  },
  {
    title: 'Billing',
    href: '/dashboard/billing',
    icon: FileText,
    roles: [UserRole.ADMIN, UserRole.VP_SALES, UserRole.CLIENT],
  },
  {
    title: 'Tickets',
    href: '/dashboard/tickets',
    icon: TicketIcon,
    roles: [
      UserRole.ADMIN,
      UserRole.REGIONAL_DIRECTOR_OPS,
      UserRole.DISTRICT_SERVICE_MANAGER,
      UserRole.CLIENT,
    ],
  },
  {
    title: 'Reports',
    href: '/dashboard/reports',
    icon: BarChart3,
    roles: [
      UserRole.ADMIN,
      UserRole.VP_SALES,
      UserRole.SALES_MANAGER,
      UserRole.REGIONAL_DIRECTOR_OPS,
    ],
  },
  {
    title: 'Users',
    href: '/dashboard/users',
    icon: Users,
    roles: [UserRole.ADMIN, UserRole.VP_SALES, UserRole.REGIONAL_DIRECTOR_OPS],
  },
  {
    title: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    roles: [
      UserRole.ADMIN,
      UserRole.VP_SALES,
      UserRole.SALES_MANAGER,
      UserRole.SALES,
      UserRole.REGIONAL_DIRECTOR_OPS,
      UserRole.DISTRICT_SERVICE_MANAGER,
      UserRole.CLIENT,
      UserRole.COLLECTOR,
    ],
  },
];

interface DashboardNavProps {
  userRole: UserRole;
  onSignOut: () => void;
}

export function DashboardNav({ userRole, onSignOut }: DashboardNavProps) {
  const pathname = usePathname();
  const [openSubmenu, setOpenSubmenu] = React.useState<string | null>(null);

  const filteredNavItems = navItems.filter((item) => item.roles.includes(userRole));
  
  // Show first 7 items, rest go in "More" menu
  const visibleItems = filteredNavItems.slice(0, 7);
  const moreItems = filteredNavItems.slice(7);

  return (
    <nav className="flex items-center gap-1">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const hasSubmenu = item.submenu && item.submenu.length > 0;
        const filteredSubmenu = hasSubmenu 
          ? item.submenu?.filter((sub) => sub.roles.includes(userRole))
          : [];
        const showSubmenu = hasSubmenu && filteredSubmenu && filteredSubmenu.length > 0;

        return (
          <div key={item.href} className="relative group">
            <Link
              href={item.href}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors rounded',
                isActive
                  ? 'bg-white/20 text-white'
                  : 'text-white/90 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.title}</span>
            </Link>

            {/* Dropdown submenu */}
            {showSubmenu && (
              <div className="absolute left-0 top-full mt-1 w-44 bg-white rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                {filteredSubmenu?.map((subItem) => {
                  const isSubActive = pathname === subItem.href;
                  return (
                    <Link
                      key={subItem.href}
                      href={subItem.href}
                      className={cn(
                        'block px-4 py-2 text-sm transition-colors first:rounded-t-md last:rounded-b-md',
                        isSubActive
                          ? 'bg-[#03C066]/10 text-[#03C066]'
                          : 'text-gray-700 hover:bg-gray-50'
                      )}
                    >
                      {subItem.title}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      
      {/* More menu for remaining items + Sign Out */}
      <div className="relative group">
        <button
          aria-label="More menu items"
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors rounded text-white/90 hover:bg-white/10 hover:text-white"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>

        <div className="absolute left-0 top-full mt-1 w-44 bg-white rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
          {moreItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-[#03C066]/10 text-[#03C066]'
                    : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.title}</span>
              </Link>
            );
          })}
          {moreItems.length > 0 && <div className="border-t my-1" />}
          <button
            onClick={onSignOut}
            className="flex items-center gap-2 px-4 py-2 text-sm w-full text-left text-gray-700 hover:bg-gray-50 rounded-b-md transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
