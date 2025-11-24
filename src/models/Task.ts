import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
  title: string;
  description?: string;
  dueDate?: Date;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Open' | 'Scheduled' | 'Hold' | 'Closed';
  taskType: 'General' | 'Follow-up' | 'Phone Call' | 'Contract Review' | 'Proposal' | 'Billing' | 'Management Change' | '60 Day Visit';
  address?: string;
  assignedTo?: mongoose.Types.ObjectId;
  assignedTeam?: mongoose.Types.ObjectId[]; // Up to 4 people can work on a task
  property?: mongoose.Types.ObjectId;
  contact?: mongoose.Types.ObjectId;
  company?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  completedAt?: Date;
  googleTaskId?: string;
  googleTaskListId?: string;
  googleCalendarEventId?: string;
  reminderMinutes?: number;
  reminderSent?: boolean;
  notes?: Array<{
    content: string;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true },
    description: String,
    dueDate: Date,
    priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    status: { type: String, enum: ['Open', 'Scheduled', 'Hold', 'Closed'], default: 'Open' },
    taskType: { 
      type: String, 
      enum: ['General', 'Follow-up', 'Phone Call', 'Contract Review', 'Proposal', 'Billing', 'Management Change', '60 Day Visit'],
      default: 'General'
    },
    address: String,
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedTeam: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    property: { type: Schema.Types.ObjectId, ref: 'Property' },
    contact: { type: Schema.Types.ObjectId, ref: 'Contact' },
    company: { type: Schema.Types.ObjectId, ref: 'Company' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    completedAt: Date,
    googleTaskId: String,
    googleTaskListId: String,
    googleCalendarEventId: String,
    reminderMinutes: { type: Number, default: 30 },
    reminderSent: { type: Boolean, default: false },
    notes: [
      {
        content: { type: String, required: true },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Delete the cached model to avoid issues in development
if (mongoose.models.Task) {
  delete mongoose.models.Task;
}

export default mongoose.model<ITask>('Task', TaskSchema);
