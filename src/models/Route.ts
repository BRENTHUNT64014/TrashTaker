import mongoose, { Schema, Document } from 'mongoose';
import { RouteStatus } from '@/types/enums';

export interface IUnitScan {
  unit: string;
  building?: string;
  scannedAt: Date;
  qrCode: string;
}

export interface IRoute extends Document {
  property: mongoose.Types.ObjectId;
  collector: mongoose.Types.ObjectId;
  date: Date;
  routeNumber: number;
  status: RouteStatus;
  arrivalPhoto?: string;
  arrivalTime?: Date;
  completionPhoto?: string;
  completionTime?: Date;
  unitScans: IUnitScan[];
  missedUnits: string[];
  petStationsScanned: number;
  commonAreasScanned: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RouteSchema = new Schema<IRoute>(
  {
    property: { type: Schema.Types.ObjectId, ref: 'Property', required: true },
    collector: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    routeNumber: { type: Number, default: 1 },
    status: { type: String, enum: Object.values(RouteStatus), default: RouteStatus.NOT_STARTED },
    arrivalPhoto: String,
    arrivalTime: Date,
    completionPhoto: String,
    completionTime: Date,
    unitScans: [
      {
        unit: String,
        building: String,
        scannedAt: Date,
        qrCode: String,
      },
    ],
    missedUnits: [String],
    petStationsScanned: { type: Number, default: 0 },
    commonAreasScanned: { type: Number, default: 0 },
    notes: String,
  },
  { timestamps: true }
);

// Index for querying routes by date and collector
RouteSchema.index({ collector: 1, date: -1 });
RouteSchema.index({ property: 1, date: -1 });

export default mongoose.models.Route || mongoose.model<IRoute>('Route', RouteSchema);
