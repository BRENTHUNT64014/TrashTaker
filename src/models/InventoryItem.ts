import mongoose, { Schema, Document } from 'mongoose';

export interface IInventoryItem extends Document {
  name: string;
  description?: string;
  sku?: string;
  category: string;
  quantity: number;
  unitPrice: number;
  reorderLevel?: number;
  supplier?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryItemSchema = new Schema<IInventoryItem>(
  {
    name: { type: String, required: true },
    description: String,
    sku: { type: String, unique: true, sparse: true },
    category: { type: String, required: true },
    quantity: { type: Number, required: true, default: 0 },
    unitPrice: { type: Number, required: true },
    reorderLevel: Number,
    supplier: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.InventoryItem ||
  mongoose.model<IInventoryItem>('InventoryItem', InventoryItemSchema);
