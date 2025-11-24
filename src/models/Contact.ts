import mongoose, { Schema, Document } from 'mongoose';

export interface IContact extends Document {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  position?: string;
  title?: string;
  company?: mongoose.Types.ObjectId;
  property?: mongoose.Types.ObjectId;
  isPrimary: boolean;
  notes?: string;
  lastVerified?: Date;
  createdBy: mongoose.Types.ObjectId;
  isActive: boolean;
  communications?: Array<{
    subject: string;
    email: string;
    body?: string;
    direction: 'sent' | 'received';
    date: Date;
    messageId?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema = new Schema<IContact>(
  {
    firstName: String,
    lastName: String,
    email: String,
    phone: String,
    position: String,
    title: String,
    company: { type: Schema.Types.ObjectId, ref: 'Company' },
    property: { type: Schema.Types.ObjectId, ref: 'Property' },
    isPrimary: { type: Boolean, default: false },
    notes: String,
    lastVerified: Date,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
    communications: [{
      subject: String,
      email: String,
      body: String,
      direction: { type: String, enum: ['sent', 'received'] },
      date: Date,
      messageId: String,
    }],
  },
  { timestamps: true }
);

// Delete the cached model to avoid issues in development
if (mongoose.models.Contact) {
  delete mongoose.models.Contact;
}

export default mongoose.model<IContact>('Contact', ContactSchema);
