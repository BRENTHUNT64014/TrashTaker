import mongoose, { Schema, Document } from 'mongoose';
import { InvoiceStatus, PaymentMethod } from '@/types/enums';

export interface IInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface IInvoice extends Document {
  invoiceNumber: string;
  property: mongoose.Types.ObjectId;
  company: mongoose.Types.ObjectId;
  items: IInvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: InvoiceStatus;
  dueDate: Date;
  paidDate?: Date;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    property: { type: Schema.Types.ObjectId, ref: 'Property', required: true },
    company: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    items: [
      {
        description: String,
        quantity: Number,
        unitPrice: Number,
        total: Number,
      },
    ],
    subtotal: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true },
    status: { type: String, enum: Object.values(InvoiceStatus), default: InvoiceStatus.DRAFT },
    dueDate: { type: Date, required: true },
    paidDate: Date,
    paymentMethod: { type: String, enum: Object.values(PaymentMethod) },
    paymentReference: String,
    notes: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Auto-generate invoice number
InvoiceSchema.pre('save', async function (next) {
  if (this.isNew) {
    const count = await mongoose.model('Invoice').countDocuments();
    const year = new Date().getFullYear();
    this.invoiceNumber = `INV-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

export default mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', InvoiceSchema);
