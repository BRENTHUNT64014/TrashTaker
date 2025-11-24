import { auth } from '@/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, MapPin, Users, TicketIcon, CheckCircle2, Clock } from 'lucide-react';
import { TodayCalendarWidget } from '@/components/dashboard/today-calendar-widget';
import dbConnect from '@/lib/mongodb';
import Task from '@/models/Task';
import Link from 'next/link';

export default async function DashboardPage() {
  const session = await auth();

  // Fetch tasks
  await dbConnect();
  const tasks = await Task.find({ createdBy: session?.user?.id })
    .populate('assignedTo', 'firstName lastName')
    .populate('property', 'address city state')
    .populate('contact', 'firstName lastName')
    .populate('company', 'name')
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const pendingTasks = tasks.filter((task: any) => task.status !== 'Completed');
  const completedTasks = tasks.filter((task: any) => task.status === 'Completed');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Welcome back, {session?.user?.name}!
        </h2>
        <p className="text-muted-foreground">Here's what's happening with your business today.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Active properties</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Companies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Routes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Routes today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <TicketIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Pending resolution</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Tasks</CardTitle>
            <CardDescription>Your latest tasks and their status</CardDescription>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="text-sm text-muted-foreground">No tasks yet. Create your first task to get started!</div>
            ) : (
              <div className="space-y-4">
                {tasks.slice(0, 5).map((task: any) => {
                  const getTaskLink = () => {
                    return `/dashboard/tasks/${task._id}`;
                  };

                  const getRelatedInfo = () => {
                    if (task.property) {
                      return `${task.property.address}, ${task.property.city}, ${task.property.state}`;
                    } else if (task.contact) {
                      return `${task.contact.firstName} ${task.contact.lastName}`;
                    } else if (task.company) {
                      return task.company.name;
                    }
                    return null;
                  };

                  const taskLink = getTaskLink();
                  const relatedInfo = getRelatedInfo();
                  const TaskWrapper = taskLink ? Link : 'div';
                  const wrapperProps = taskLink ? { href: taskLink } : {};

                  return (
                    <TaskWrapper 
                      key={task._id.toString()} 
                      {...wrapperProps}
                      className={`flex items-start justify-between border-b pb-3 last:border-0 ${
                        taskLink ? 'hover:bg-gray-50 -mx-2 px-2 rounded transition-colors cursor-pointer' : ''
                      }`}
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          {task.status === 'Completed' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                          ) : (
                            <Clock className="h-4 w-4 text-orange-500 flex-shrink-0" />
                          )}
                          <p className="font-medium">{task.title}</p>
                        </div>
                        {task.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">{task.description}</p>
                        )}
                        {relatedInfo && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {relatedInfo}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          <span className={`px-2 py-0.5 rounded ${
                            task.priority === 'High' ? 'bg-red-100 text-red-700' :
                            task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {task.priority}
                          </span>
                          <span className={`px-2 py-0.5 rounded ${
                            task.status === 'Completed' ? 'bg-green-100 text-green-700' :
                            task.status === 'In Progress' ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {task.status}
                          </span>
                          {task.dueDate && (
                            <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </TaskWrapper>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <TodayCalendarWidget />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Task Statistics</CardTitle>
            <CardDescription>Overview of your tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <span className="text-sm">Pending Tasks</span>
                </div>
                <span className="text-2xl font-bold">{pendingTasks.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Completed Tasks</span>
                </div>
                <span className="text-2xl font-bold">{completedTasks.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
