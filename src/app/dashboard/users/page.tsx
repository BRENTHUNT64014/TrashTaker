'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, UserPlus, Mail, Phone, Filter, Users as UsersIcon, Shield } from 'lucide-react';
import { UserRole } from '@/types/enums';
import UserEditDialog from '@/components/users/user-edit-dialog';

export default function UsersPage() {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const isAdmin = session?.user?.role === UserRole.ADMIN;

  // Fetch all users
  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ['users', roleFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (roleFilter !== 'all') {
        params.append('roles', roleFilter);
      }
      const res = await fetch(`/api/users?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
  });

  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const handleAddUser = () => {
    setSelectedUser(null);
    setEditDialogOpen(true);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this user?')) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete user');
      }

      alert('User deactivated successfully');
      refetch();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  // Filter users based on search query
  const filteredUsers = users.filter((user: any) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      (user.phone && user.phone.toLowerCase().includes(searchLower))
    );
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'bg-red-100 text-red-700 border-red-200';
      case UserRole.VP_SALES:
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case UserRole.SALES_MANAGER:
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case UserRole.SALES:
        return 'bg-green-100 text-green-700 border-green-200';
      case UserRole.REGIONAL_DIRECTOR_OPS:
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case UserRole.DISTRICT_SERVICE_MANAGER:
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case UserRole.COLLECTOR:
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case UserRole.CLIENT:
        return 'bg-teal-100 text-teal-700 border-teal-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatRoleName = (role: string) => {
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  // Count users by role
  const userStats = {
    total: users.length,
    admin: users.filter((u: any) => u.role === UserRole.ADMIN).length,
    sales: users.filter((u: any) => [UserRole.VP_SALES, UserRole.SALES_MANAGER, UserRole.SALES].includes(u.role)).length,
    operations: users.filter((u: any) => [UserRole.REGIONAL_DIRECTOR_OPS, UserRole.DISTRICT_SERVICE_MANAGER].includes(u.role)).length,
    collectors: users.filter((u: any) => u.role === UserRole.COLLECTOR).length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground mt-1">Manage your team members and their roles</p>
        </div>
        {isAdmin && (
          <Button onClick={handleAddUser}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.total}</div>
            <p className="text-xs text-muted-foreground">Active team members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales Team</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.sales}</div>
            <p className="text-xs text-muted-foreground">Sales personnel</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Operations</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.operations}</div>
            <p className="text-xs text-muted-foreground">Operations staff</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administrators</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.admin}</div>
            <p className="text-xs text-muted-foreground">System admins</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Role Filter */}
            <div className="w-full md:w-64">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                  <SelectItem value={UserRole.VP_SALES}>VP Sales</SelectItem>
                  <SelectItem value={UserRole.SALES_MANAGER}>Sales Manager</SelectItem>
                  <SelectItem value={UserRole.SALES}>Sales</SelectItem>
                  <SelectItem value={UserRole.REGIONAL_DIRECTOR_OPS}>Regional Director Ops</SelectItem>
                  <SelectItem value={UserRole.DISTRICT_SERVICE_MANAGER}>District Service Manager</SelectItem>
                  <SelectItem value={UserRole.COLLECTOR}>Collector</SelectItem>
                  <SelectItem value={UserRole.CLIENT}>Client</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <UsersIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No users found</h3>
              <p className="text-muted-foreground">
                {searchQuery || roleFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Get started by adding your first user'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Territory</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user: any) => (
                    <TableRow key={user._id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <a href={`mailto:${user.email}`} className="text-blue-600 hover:underline">
                            {user.email}
                          </a>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.phone ? (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <a href={`tel:${user.phone}`} className="text-blue-600 hover:underline">
                              {user.phone}
                            </a>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role)}`}>
                          {formatRoleName(user.role)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {user.territory || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        {isAdmin ? (
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditUser(user)}
                            >
                              Edit
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteUser(user._id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Deactivate
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">View Only</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Edit Dialog */}
      <UserEditDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onSuccess={() => {
          refetch();
        }}
      />
    </div>
  );
}
