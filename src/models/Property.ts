import mongoose, { Schema, Document } from 'mongoose';
import {
  PropertyStatus,
  StartType,
  BuildingType,
  AccessType,
  DisposalType,
  CollectionType,
  StartTime,
} from '@/types/enums';

export interface ICommonArea {
  type: string;
  numberOfContainers: number;
}

export interface IProperty extends Document {
  // Admin Information
  createdBy?: mongoose.Types.ObjectId;
  accountExecutive?: mongoose.Types.ObjectId;
  salesManager?: mongoose.Types.ObjectId;
  regionalDirectorOps?: mongoose.Types.ObjectId;
  districtServiceManager?: mongoose.Types.ObjectId;

  // Property Details
  alnId?: string;
  alnPriceClass?: string;
  propType?: string;
  feeManaged?: string;
  name: string;
  propertyName?: string; // Keep for backwards compatibility
  company: mongoose.Types.ObjectId;
  managementCompany?: mongoose.Types.ObjectId; // Keep for backwards compatibility
  phone?: string;
  unitCount: number;
  totalUnits?: number; // Keep for backwards compatibility
  officeEmail?: string;
  regionalManager?: mongoose.Types.ObjectId;
  propertyManager?: mongoose.Types.ObjectId;
  ownershipGroup?: string;
  ownerName?: string;
  accountNumber?: string;
  county?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode?: string;
    zip?: string;
  };
  location?: {
    type: string;
    coordinates: [number, number];
  };

  // Client Contacts
  contacts?: mongoose.Types.ObjectId[];

  // Start and Collection Details
  requestedStartDate?: Date;
  startTime?: StartTime;
  accessType?: AccessType;
  buildingType?: BuildingType;
  totalNumberOfBuildings?: number;
  disposalType?: DisposalType;
  totalDumpstersOrCompactors?: number;
  recycling?: boolean;
  startType?: StartType;
  collectionType?: CollectionType;
  containerType?: mongoose.Types.ObjectId;
  petStationColor?: string;
  petStationCollection?: boolean;
  totalPetStations?: number;
  commonAreaCollection?: boolean;
  commonAreas?: ICommonArea[];

  // District Manager Assignment
  territory?: string;

  // Pay Details
  numberOfRoutes?: number;
  route1Pay?: {
    percentage: number;
    unitPay: number;
    dailyPay: number;
    minPay: number;
    maxPay: number;
  };
  route2Pay?: {
    percentage: number;
    unitPay: number;
    dailyPay: number;
    minPay: number;
    maxPay: number;
  };

  // Operations Details
  numberOfKeys?: number;
  lockBoxCode?: string;
  lockBoxLocation?: string;
  lockBoxPhoto?: string;
  operationsNotes?: string;

  // Status and workflow
  status: PropertyStatus;
  approvedByOps?: mongoose.Types.ObjectId;
  approvedByOpsAt?: Date;
  approvedByDistrictManager?: mongoose.Types.ObjectId;
  approvedByDistrictManagerAt?: Date;

  // Change Log
  changeLog?: Array<{
    date: Date;
    changes: string[];
    uploadedBy: mongoose.Types.ObjectId;
  }>;

  // Meetings & AI Notes
  meetings?: Array<{
    title: string;
    date: Date;
    meetLink?: string;
    aiNotes?: string;
    attendees?: string[];
    calendarEventId?: string;
  }>;

  // Communications
  communications?: Array<{
    subject: string;
    email: string;
    direction: 'sent' | 'received';
    date: Date;
    messageId?: string;
  }>;

  // Tasks & Follow-ups
  tasks?: Array<{
    title: string;
    dueDate?: Date;
    completed: boolean;
    completedAt?: Date;
    createdBy: mongoose.Types.ObjectId;
  }>;

  // Status History
  statusHistory?: Array<{
    status: string;
    previousStatus?: string;
    changedAt: Date;
    changedBy: string;
    userId?: mongoose.Types.ObjectId;
  }>;

  // Notes
  notes?: Array<{
    content: string;
    createdAt: Date;
    createdBy: string;
  }>;

  // Attachments
  attachments?: Array<{
    filename: string;
    url: string;
    uploadedAt: Date;
    uploadedBy?: mongoose.Types.ObjectId;
  }>;

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PropertySchema = new Schema<IProperty>(
  {
    // Admin Information
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    accountExecutive: { type: Schema.Types.ObjectId, ref: 'User' },
    salesManager: { type: Schema.Types.ObjectId, ref: 'User' },
    regionalDirectorOps: { type: Schema.Types.ObjectId, ref: 'User' },
    districtServiceManager: { type: Schema.Types.ObjectId, ref: 'User' },

    // Property Details
    alnId: { type: String, unique: true, sparse: true },
    alnPriceClass: String,
    propType: String,
    feeManaged: String,
    name: { type: String, required: true },
    propertyName: String, // Keep for backwards compatibility
    company: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    managementCompany: { type: Schema.Types.ObjectId, ref: 'Company' }, // Keep for backwards compatibility
    phone: String,
    unitCount: { type: Number, required: true },
    totalUnits: Number, // Keep for backwards compatibility
    officeEmail: String,
    regionalManager: { type: Schema.Types.ObjectId, ref: 'Contact' },
    propertyManager: { type: Schema.Types.ObjectId, ref: 'Contact' },
    ownershipGroup: String,
    ownerName: String,
    accountNumber: String,
    county: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      zip: String,
    },
    location: {
      type: { type: String, enum: ['Point'] },
      coordinates: { type: [Number] },
    },

    // Client Contacts
    contacts: [{ type: Schema.Types.ObjectId, ref: 'Contact' }],

    // Start and Collection Details
    requestedStartDate: Date,
    startTime: { type: String, enum: Object.values(StartTime) },
    accessType: { type: String, enum: Object.values(AccessType) },
    buildingType: { type: String, enum: Object.values(BuildingType) },
    totalNumberOfBuildings: Number,
    disposalType: { type: String, enum: Object.values(DisposalType) },
    totalDumpstersOrCompactors: Number,
    recycling: Boolean,
    startType: { type: String, enum: Object.values(StartType) },
    collectionType: { type: String, enum: Object.values(CollectionType) },
    containerType: { type: Schema.Types.ObjectId, ref: 'InventoryItem' },
    petStationColor: String,
    petStationCollection: Boolean,
    totalPetStations: Number,
    commonAreaCollection: Boolean,
    commonAreas: [
      {
        type: String,
        numberOfContainers: Number,
      },
    ],

    // District Manager Assignment
    territory: String,

    // Pay Details
    numberOfRoutes: { type: Number, default: 1 },
    route1Pay: {
      percentage: Number,
      unitPay: Number,
      dailyPay: Number,
      minPay: Number,
      maxPay: Number,
    },
    route2Pay: {
      percentage: Number,
      unitPay: Number,
      dailyPay: Number,
      minPay: Number,
      maxPay: Number,
    },

    // Operations Details
    numberOfKeys: Number,
    lockBoxCode: String,
    lockBoxLocation: String,
    lockBoxPhoto: String,
    operationsNotes: String,

    // Status and workflow
    status: {
      type: String,
      default: 'Lead',
    },
    approvedByOps: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedByOpsAt: Date,
    approvedByDistrictManager: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedByDistrictManagerAt: Date,

    // Change Log
    changeLog: [
      {
        date: { type: Date, default: Date.now },
        changes: [String],
        uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    // Meetings & AI Notes
    meetings: [
      {
        title: String,
        date: Date,
        meetLink: String,
        aiNotes: String,
        attendees: [String],
        calendarEventId: String,
      },
    ],

    // Communications
    communications: [
      {
        subject: String,
        email: String,
        body: String, // Full email body content (HTML)
        direction: { type: String, enum: ['sent', 'received'] },
        date: Date,
        messageId: String,
      },
    ],

    // Tasks & Follow-ups
    tasks: [
      {
        title: String,
        dueDate: Date,
        completed: { type: Boolean, default: false },
        completedAt: Date,
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    // Status History
    statusHistory: [
      {
        status: String,
        previousStatus: String,
        changedAt: { type: Date, default: Date.now },
        changedBy: String,
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    // Notes
    notes: [
      {
        content: String,
        createdAt: { type: Date, default: Date.now },
        createdBy: String,
      },
    ],

    // Attachments
    attachments: [
      {
        filename: String,
        url: String,
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Create geospatial index for location-based queries (only if coordinates exist)
PropertySchema.index({ location: '2dsphere' }, { sparse: true });

// Delete cached model to ensure schema changes are applied
if (mongoose.models.Property) {
  delete mongoose.models.Property;
}

export default mongoose.model<IProperty>('Property', PropertySchema);
