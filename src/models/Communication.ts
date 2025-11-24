import mongoose, { Schema, Document } from 'mongoose';
import { CommunicationType } from '@/types/enums';

export interface ICommunication extends Document {
  type: CommunicationType;
  from: mongoose.Types.ObjectId;
  to: string;
  subject?: string;
  message?: string;
  status: string;
  metadata?: Record<string, any>;
  property?: mongoose.Types.ObjectId;
  contact?: mongoose.Types.ObjectId;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CommunicationSchema = new Schema<ICommunication>(
  {
    type: { type: String, enum: Object.values(CommunicationType), required: true },
    from: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    to: { type: String, required: true },
    subject: String,
    message: String,
    status: { type: String, required: true },
    metadata: Schema.Types.Mixed,
    property: { type: Schema.Types.ObjectId, ref: 'Property' },
    contact: { type: Schema.Types.ObjectId, ref: 'Contact' },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// TTL index to auto-delete communications after 12 months
CommunicationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.Communication ||
  mongoose.model<ICommunication>('Communication', CommunicationSchema);
