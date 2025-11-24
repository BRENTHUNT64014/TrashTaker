import mongoose, { Schema, Document } from 'mongoose';
import { ViolationType, ViolationStatus } from '@/types/enums';

export interface IViolation extends Document {
  property: mongoose.Types.ObjectId;
  unit: string;
  building?: string;
  violationType: ViolationType;
  photos: string[];
  notes?: string;
  reportedBy: mongoose.Types.ObjectId;
  reportedAt: Date;
  status: ViolationStatus;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  sentAt?: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ViolationSchema = new Schema<IViolation>(
  {
    property: { type: Schema.Types.ObjectId, ref: 'Property', required: true },
    unit: { type: String, required: true },
    building: String,
    violationType: { type: String, enum: Object.values(ViolationType), required: true },
    photos: [String],
    notes: String,
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reportedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: Object.values(ViolationStatus),
      default: ViolationStatus.PENDING_APPROVAL,
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    sentAt: Date,
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// TTL index to auto-delete violations after 90 days
ViolationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.Violation ||
  mongoose.model<IViolation>('Violation', ViolationSchema);
