'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserRole } from '@/types/enums';

interface UserEditDialogProps {
  open: boolean;
  onClose: () => void;
  user: any | null;
  onSuccess?: () => void;
}

export default function UserEditDialog({ open, onClose, user, onSuccess }: UserEditDialogProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.SALES);
  const [territory, setTerritory] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setRole(user.role || UserRole.SALES);
      setTerritory(user.territory || '');
      setIsActive(user.isActive !== false);
      setPassword('');
      setConfirmPassword('');
    } else if (open && !user) {
      // Reset for new user
      setName('');
      setEmail('');
      setPhone('');
      setRole(UserRole.SALES);
      setTerritory('');
      setIsActive(true);
      setPassword('');
      setConfirmPassword('');
    }
  }, [open, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      alert('Name and email are required');
      return;
    }

    // Validate password for new users or if password is being changed
    if (!user || password) {
      if (!password || password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
      }
      if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
      }
    }

    setSaving(true);
    try {
      const payload: any = {
        name,
        email,
        phone,
        role,
        territory,
        isActive,
      };

      // Only include password if it's being set/changed
      if (password) {
        payload.password = password;
      }

      const url = user ? `/api/users/${user._id}` : '/api/users';
      const method = user ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save user');
      }

      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Error saving user:', error);
      alert(error.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{user ? 'Edit User' : 'Add New User'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                required
              />
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <Label htmlFor="role">Role *</Label>
              <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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

          <div>
            <Label htmlFor="territory">Territory</Label>
            <Input
              id="territory"
              value={territory}
              onChange={(e) => setTerritory(e.target.value)}
              placeholder="e.g., Northeast, West Coast"
            />
          </div>

          <div className="border-t pt-4">
            <Label className="text-base font-semibold mb-3 block">
              {user ? 'Change Password (leave blank to keep current)' : 'Set Password *'}
            </Label>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="password">Password {!user && '*'}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={user ? 'Leave blank to keep current' : 'Min 6 characters'}
                  required={!user}
                  minLength={6}
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password {!user && '*'}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required={!user || !!password}
                />
              </div>
            </div>
          </div>

          {user && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Active user (uncheck to deactivate)
              </Label>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : user ? 'Update User' : 'Create User'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
