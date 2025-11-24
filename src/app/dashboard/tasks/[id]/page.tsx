'use client';

import { use, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, CheckCircle2, Clock, User, Building2, MapPin, FileText, Plus, Edit2, X, UserPlus } from 'lucide-react';

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [editingDueDate, setEditingDueDate] = useState(false);
  const [newDueDate, setNewDueDate] = useState('');
  const [addingTeamMember, setAddingTeamMember] = useState(false);

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', id],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/${id}`);
      if (!res.ok) throw new Error('Failed to fetch task');
      return res.json();
    },
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
  });

  const handleStatusChange = async (newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: newStatus,
          completedAt: newStatus === 'Completed' ? new Date() : null
        }),
      });

      if (!res.ok) throw new Error('Failed to update task');

      await queryClient.invalidateQueries({ queryKey: ['task', id] });
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Failed to update task status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setAddingNote(true);
    try {
      const res = await fetch(`/api/tasks/${id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote }),
      });

      if (!res.ok) throw new Error('Failed to add note');

      setNewNote('');
      await queryClient.invalidateQueries({ queryKey: ['task', id] });
    } catch (error) {
      console.error('Error adding note:', error);
      alert('Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  const handleUpdateDueDate = async () => {
    if (!newDueDate) return;

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dueDate: new Date(newDueDate) }),
      });

      if (!res.ok) throw new Error('Failed to update due date');

      setEditingDueDate(false);
      setNewDueDate('');
      await queryClient.invalidateQueries({ queryKey: ['task', id] });
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (error) {
      console.error('Error updating due date:', error);
      alert('Failed to update due date');
    }
  };

  const handleAddTeamMember = async (userId: string) => {
    const currentTeam = task.assignedTeam || [];
    if (currentTeam.length >= 4) {
      alert('Maximum 4 team members allowed');
      return;
    }

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          assignedTeam: [...currentTeam.map((m: any) => m._id || m), userId]
        }),
      });

      if (!res.ok) throw new Error('Failed to add team member');

      await queryClient.invalidateQueries({ queryKey: ['task', id] });
      setAddingTeamMember(false);
    } catch (error) {
      console.error('Error adding team member:', error);
      alert('Failed to add team member');
    }
  };

  const handleRemoveTeamMember = async (userId: string) => {
    const currentTeam = task.assignedTeam || [];
    
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          assignedTeam: currentTeam.filter((m: any) => (m._id || m).toString() !== userId)
        }),
      });

      if (!res.ok) throw new Error('Failed to remove team member');

      await queryClient.invalidateQueries({ queryKey: ['task', id] });
    } catch (error) {
      console.error('Error removing team member:', error);
      alert('Failed to remove team member');
    }
  };

  const handleDeleteTask = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete task');

      alert('Task deleted successfully');
      router.push('/dashboard');
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Task not found</div>
      </div>
    );
  }

  const priorityColors = {
    Low: 'bg-blue-100 text-blue-800',
    Medium: 'bg-yellow-100 text-yellow-800',
    High: 'bg-red-100 text-red-800',
  };

  const statusColors = {
    'To Do': 'bg-gray-100 text-gray-800',
    'In Progress': 'bg-blue-100 text-blue-800',
    'Completed': 'bg-green-100 text-green-800',
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/dashboard')}
              className="hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-gray-400" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${priorityColors[task.priority as keyof typeof priorityColors]}`}>
                      {task.priority} Priority
                    </span>
                    <span>•</span>
                    <span>Created {new Date(task.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleDeleteTask}
              variant="destructive"
              size="sm"
            >
              Delete Task
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>Task Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Select 
                    value={task.status} 
                    onValueChange={handleStatusChange}
                    disabled={updatingStatus}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="To Do">To Do</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {task.status === 'Completed' && task.completedAt && (
                  <div className="text-sm text-gray-600">
                    Completed on {new Date(task.completedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Task Information */}
            <Card>
              <CardHeader>
                <CardTitle>Task Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {task.description && (
                  <div>
                    <div className="text-sm font-medium text-gray-600 mb-1">Description</div>
                    <div className="text-sm text-gray-900">{task.description}</div>
                  </div>
                )}
                
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm font-medium text-gray-600">Due Date</div>
                    {!editingDueDate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingDueDate(true);
                          setNewDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
                        }}
                        className="h-6 px-2"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  {editingDueDate ? (
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={newDueDate}
                        onChange={(e) => setNewDueDate(e.target.value)}
                        className="text-sm"
                      />
                      <Button size="sm" onClick={handleUpdateDueDate}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingDueDate(false)}>Cancel</Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-gray-900">
                      <Clock className="h-4 w-4" />
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date set'}
                    </div>
                  )}
                </div>

                {task.assignedTo && (
                  <div>
                    <div className="text-sm font-medium text-gray-600 mb-1">Primary Assignee</div>
                    <div className="flex items-center gap-2 text-sm text-gray-900">
                      <User className="h-4 w-4" />
                      {task.assignedTo.name || task.assignedTo.email}
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-gray-600">Team Members ({(task.assignedTeam?.length || 0)}/4)</div>
                    {!addingTeamMember && (task.assignedTeam?.length || 0) < 4 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAddingTeamMember(true)}
                        className="h-6 px-2"
                      >
                        <UserPlus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    )}
                  </div>
                  
                  {addingTeamMember && users && (
                    <div className="mb-2">
                      <Select onValueChange={(value) => handleAddTeamMember(value)}>
                        <SelectTrigger className="w-full text-sm">
                          <SelectValue placeholder="Select team member..." />
                        </SelectTrigger>
                        <SelectContent>
                          {users.filter((u: any) => 
                            u._id !== task.assignedTo?._id && 
                            !task.assignedTeam?.some((m: any) => (m._id || m).toString() === u._id)
                          ).map((user: any) => (
                            <SelectItem key={user._id} value={user._id}>
                              {user.name || user.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setAddingTeamMember(false)}
                        className="mt-1 h-6 text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  )}

                  {task.assignedTeam && task.assignedTeam.length > 0 ? (
                    <div className="space-y-2">
                      {task.assignedTeam.map((member: any) => (
                        <div key={member._id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4 text-gray-400" />
                            <span>{member.name || member.email}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveTeamMember(member._id)}
                            className="h-6 w-6 p-0 hover:bg-red-100"
                          >
                            <X className="h-3 w-3 text-red-600" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 italic">No team members added</div>
                  )}
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-600 mb-1">Created By</div>
                  <div className="flex items-center gap-2 text-sm text-gray-900">
                    <User className="h-4 w-4" />
                    {task.createdBy?.name || task.createdBy?.email || 'Unknown'}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Related Items */}
            <Card>
              <CardHeader>
                <CardTitle>Related Items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {task.property && (
                  <div 
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                    onClick={() => router.push(`/dashboard/crm/properties/${task.property._id}`)}
                  >
                    <MapPin className="h-5 w-5 text-[#03C066]" />
                    <div>
                      <div className="text-xs text-gray-500">Property</div>
                      <div className="text-sm font-medium text-gray-900">
                        {task.property.name || task.property.propertyName}
                      </div>
                    </div>
                  </div>
                )}

                {task.contact && (
                  <div 
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                    onClick={() => router.push(`/dashboard/crm/contacts/${task.contact._id}`)}
                  >
                    <User className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="text-xs text-gray-500">Contact</div>
                      <div className="text-sm font-medium text-gray-900">
                        {task.contact.firstName} {task.contact.lastName}
                      </div>
                    </div>
                  </div>
                )}

                {task.company && (
                  <div 
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                    onClick={() => router.push(`/dashboard/crm/companies/${task.company._id}`)}
                  >
                    <Building2 className="h-5 w-5 text-purple-600" />
                    <div>
                      <div className="text-xs text-gray-500">Company</div>
                      <div className="text-sm font-medium text-gray-900">
                        {task.company.name}
                      </div>
                    </div>
                  </div>
                )}

                {!task.property && !task.contact && !task.company && (
                  <div className="text-sm text-gray-500 text-center py-4">
                    No related items
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Notes Section */}
          <Card>
            <CardHeader>
              <CardTitle>Notes ({task.notes?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Note */}
              <div className="space-y-2">
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  rows={3}
                  className="resize-none"
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleAddNote}
                    disabled={!newNote.trim() || addingNote}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {addingNote ? 'Adding...' : 'Add Note'}
                  </Button>
                </div>
              </div>

              {/* Notes List */}
              {task.notes && task.notes.length > 0 ? (
                <div className="space-y-3 pt-4 border-t">
                  {task.notes
                    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((note: any, idx: number) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">
                              {note.createdBy?.name || note.createdBy?.email || 'Unknown'}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(note.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No notes yet. Add one above to get started.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
