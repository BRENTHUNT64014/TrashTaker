import mongoose, { Schema, Document } from 'mongoose';

export interface IHotSheet extends Document {
  property: mongoose.Types.ObjectId;
  unit: string;
  building?: string;
  startDate: Date;
  endDate: Date;
  duration: number;
  instructions: string;
  arrivalPhoto?: string;
  completionPhoto?: string;
  completedBy?: mongoose.Types.ObjectId;
  completedAt?: Date;
  isCompleted: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const HotSheetSchema = new Schema<IHotSheet>(
  {
    property: { type: Schema.Types.ObjectId, ref: 'Property', required: true },
    unit: { type: String, required: true },
    building: String,
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    duration: { type: Number, required: true },
    instructions: { type: String, required: true },
    arrivalPhoto: String,
    completionPhoto: String,
    completedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    completedAt: Date,
    isCompleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Index for active hot sheets
HotSheetSchema.index({ property: 1, isCompleted: 1, startDate: 1 });

export default mongoose.models.HotSheet || mongoose.model<IHotSheet>('HotSheet', HotSheetSchema);
