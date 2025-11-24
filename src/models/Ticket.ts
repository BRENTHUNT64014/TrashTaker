import mongoose, { Schema, Document } from 'mongoose';
import { TicketStatus, TicketPriority } from '@/types/enums';

export interface ITicket extends Document {
  ticketNumber: string;
  property: mongoose.Types.ObjectId;
  submittedBy: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId;
  subject: string;
  description: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  resolution?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  dueDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TicketSchema = new Schema<ITicket>(
  {
    ticketNumber: { type: String, required: true, unique: true },
    property: { type: Schema.Types.ObjectId, ref: 'Property', required: true },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    priority: {
      type: String,
      enum: Object.values(TicketPriority),
      default: TicketPriority.MEDIUM,
    },
    status: { type: String, enum: Object.values(TicketStatus), default: TicketStatus.OPEN },
    resolution: String,
    acknowledgedAt: Date,
    resolvedAt: Date,
    closedAt: Date,
    dueDate: { type: Date, required: true },
  },
  { timestamps: true }
);

// Auto-generate ticket number
TicketSchema.pre('save', async function (next) {
  if (this.isNew) {
    const count = await mongoose.model('Ticket').countDocuments();
    this.ticketNumber = `TT-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

export default mongoose.models.Ticket || mongoose.model<ITicket>('Ticket', TicketSchema);
