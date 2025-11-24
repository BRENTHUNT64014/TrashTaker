import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import dbConnect from '@/lib/mongodb';
import Task from '@/models/Task';
import Property from '@/models/Property';
import Communication from '@/models/Communication';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckSquare, Calendar, Phone, ChevronUp, User } from 'lucide-react';
import Link from 'next/link';

export default async function ActivitiesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  await dbConnect();

  // Fetch Open Tasks
  const openTasks = await Task.find({
    createdBy: session.user.id,
    status: { $in: ['To Do', 'In Progress'] }
  })
    .populate('assignedTo', 'firstName lastName')
    .populate('property', 'name address')
    .populate('contact', 'firstName lastName')
    .sort({ dueDate: 1 })
    .lean();

  // Fetch Closed Tasks
  const closedTasks = await Task.find({
    createdBy: session.user.id,
    status: 'Completed'
  })
    .populate('assignedTo', 'firstName lastName')
    .populate('property', 'name address')
    .populate('contact', 'firstName lastName')
    .sort({ completedAt: -1 })
    .limit(10)
    .lean();

  // Fetch Open Meetings (upcoming meetings)
  const properties = await Property.find({
    createdBy: session.user.id,
    'meetings.meetingDate': { $gte: new Date() }
  })
    .populate('contacts', 'firstName lastName')
    .sort({ 'meetings.meetingDate': 1 })
    .lean();

  const openMeetings = properties
    .flatMap((prop: any) => 
      prop.meetings
        ?.filter((m: any) => new Date(m.meetingDate) >= new Date())
        .map((meeting: any) => ({
          ...meeting,
          property: prop,
          propertyId: prop._id,
          propertyName: prop.name || prop.address?.street
        }))
    )
    .filter(Boolean)
    .sort((a: any, b: any) => new Date(a.meetingDate).getTime() - new Date(b.meetingDate).getTime());

  // Fetch Closed Meetings (past meetings)
  const pastProperties = await Property.find({
    createdBy: session.user.id,
    'meetings.meetingDate': { $lt: new Date() }
  })
    .populate('contacts', 'firstName lastName')
    .sort({ 'meetings.meetingDate': -1 })
    .lean();

  const closedMeetings = pastProperties
    .flatMap((prop: any) => 
      prop.meetings
        ?.filter((m: any) => new Date(m.meetingDate) < new Date())
        .map((meeting: any) => ({
          ...meeting,
          property: prop,
          propertyId: prop._id,
          propertyName: prop.name || prop.address?.street
        }))
    )
    .filter(Boolean)
    .sort((a: any, b: any) => new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime())
    .slice(0, 10);

  // Fetch Open Calls (in-progress or queued)
  const openCalls = await Communication.find({
    from: session.user.id,
    type: 'CALL',
    status: { $in: ['queued', 'ringing', 'in-progress', 'initiated'] }
  })
    .populate('contact', 'firstName lastName')
    .sort({ createdAt: -1 })
    .lean();

  // Fetch Closed Calls (completed or failed)
  const closedCalls = await Communication.find({
    from: session.user.id,
    type: 'CALL',
    status: { $in: ['completed', 'busy', 'no-answer', 'failed', 'canceled'] }
  })
    .populate('contact', 'firstName lastName')
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  return (
    <div className="p-6 space-y-8">
      {/* Open Activities */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Open Activities</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              Add New
            </Button>
            <Button variant="outline" size="sm">
              Column View
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Open Tasks */}
          <Card>
            <CardHeader className="border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <CheckSquare className="h-5 w-5" />
                  Open Tasks
                  <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                    {openTasks.length}
                  </span>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {openTasks.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No records found</p>
              ) : (
                <div className="space-y-3">
                  {openTasks.map((task: any) => (
                    <Link 
                      key={task._id.toString()} 
                      href={`/dashboard/tasks/${task._id}`}
                      className="block p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <h3 className="text-sm font-medium text-blue-600 hover:underline mb-1">
                        {task.title}
                      </h3>
                      <p className="text-xs text-gray-600 mb-2">
                        {task.dueDate && new Date(task.dueDate).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </p>
                      {task.assignedTo && (
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <User className="h-3 w-3" />
                          {task.assignedTo.firstName} {task.assignedTo.lastName}
                        </div>
                      )}
                      <div className="mt-2 pt-2 border-t space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Status</span>
                          <span className="font-medium">: {task.status}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Priority</span>
                          <span className="font-medium">: {task.priority}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Open Meetings */}
          <Card>
            <CardHeader className="border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Calendar className="h-5 w-5" />
                  Open Meetings
                  <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                    {openMeetings.length}
                  </span>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {openMeetings.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No records found</p>
              ) : (
                <div className="space-y-3">
                  {openMeetings.map((meeting: any, idx: number) => (
                    <Link
                      key={idx}
                      href={`/dashboard/properties/${meeting.propertyId}`}
                      className="block p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <h3 className="text-sm font-medium text-blue-600 hover:underline mb-1">
                        {meeting.title || 'Meeting'}
                      </h3>
                      <p className="text-xs text-gray-600 mb-2">
                        {new Date(meeting.meetingDate).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })} {new Date(meeting.meetingDate).toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit',
                          hour12: true 
                        })}
                      </p>
                      {meeting.attendee && (
                        <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
                          <User className="h-3 w-3" />
                          {meeting.attendee}
                        </div>
                      )}
                      {meeting.propertyName && (
                        <p className="text-xs text-gray-500">
                          Property: {meeting.propertyName}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Open Calls */}
          <Card>
            <CardHeader className="border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Phone className="h-5 w-5" />
                  Open Calls
                  <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                    {openCalls.length}
                  </span>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {openCalls.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No records found</p>
              ) : (
                <div className="space-y-3">
                  {openCalls.map((call: any) => (
                    <div
                      key={call._id.toString()}
                      className="p-3 border rounded-lg"
                    >
                      <h3 className="text-sm font-medium mb-1">
                        {call.contact ? `${call.contact.firstName} ${call.contact.lastName}` : 'Unknown Contact'}
                      </h3>
                      <p className="text-xs text-gray-600 mb-2">
                        {new Date(call.createdAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">
                          {call.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Closed Activities */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Closed Activities</h2>
          <Button variant="ghost" size="sm">
            <ChevronUp className="h-4 w-4 mr-2" />
            Column View
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Closed Tasks */}
          <Card>
            <CardHeader className="border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <CheckSquare className="h-5 w-5" />
                  Closed Tasks
                  <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                    {closedTasks.length}+
                  </span>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {closedTasks.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No records found</p>
              ) : (
                <div className="space-y-3">
                  {closedTasks.map((task: any) => (
                    <Link
                      key={task._id.toString()}
                      href={`/dashboard/tasks/${task._id}`}
                      className="block p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <h3 className="text-sm font-medium text-blue-600 hover:underline mb-1">
                        {task.title}
                      </h3>
                      <p className="text-xs text-gray-600 mb-2">
                        {task.completedAt ? new Date(task.completedAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        }) : 'N/A'}
                      </p>
                      {task.assignedTo && (
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <User className="h-3 w-3" />
                          {task.assignedTo.firstName} {task.assignedTo.lastName}
                        </div>
                      )}
                      <div className="mt-2 pt-2 border-t">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Closed Time</span>
                          <span className="font-medium">
                            : {task.completedAt ? new Date(task.completedAt).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            }) : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Closed Meetings */}
          <Card>
            <CardHeader className="border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Calendar className="h-5 w-5" />
                  Closed Meetings
                  <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                    {closedMeetings.length}
                  </span>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {closedMeetings.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No records found</p>
              ) : (
                <div className="space-y-3">
                  {closedMeetings.map((meeting: any, idx: number) => (
                    <Link
                      key={idx}
                      href={`/dashboard/properties/${meeting.propertyId}`}
                      className="block p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <h3 className="text-sm font-medium text-blue-600 hover:underline mb-1">
                        {meeting.title || 'Meeting'}
                      </h3>
                      <p className="text-xs text-gray-600 mb-2">
                        {new Date(meeting.meetingDate).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })} {new Date(meeting.meetingDate).toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit',
                          hour12: true 
                        })}
                      </p>
                      {meeting.attendee && (
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <User className="h-3 w-3" />
                          {meeting.attendee}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Closed Calls */}
          <Card>
            <CardHeader className="border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Phone className="h-5 w-5" />
                  Closed Calls
                  <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                    {closedCalls.length}
                  </span>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {closedCalls.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No records found</p>
              ) : (
                <div className="space-y-3">
                  {closedCalls.map((call: any) => (
                    <div
                      key={call._id.toString()}
                      className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <h3 className="text-sm font-medium mb-1">
                        {call.contact ? `${call.contact.firstName} ${call.contact.lastName}` : 'Unknown Contact'}
                      </h3>
                      <p className="text-xs text-gray-600 mb-2">
                        {new Date(call.createdAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </p>
                      {call.contact && (
                        <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
                          <User className="h-3 w-3" />
                          {call.contact.firstName} {call.contact.lastName}
                        </div>
                      )}
                      {call.metadata?.duration && (
                        <p className="text-xs text-gray-500">
                          Duration: {Math.floor(call.metadata.duration / 60)}m {call.metadata.duration % 60}s
                        </p>
                      )}
                      {call.message && (
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-xs text-gray-700">
                            Description: {call.message}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
