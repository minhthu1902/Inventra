import mongoose from "mongoose";

const inventoryItemSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
      index: true,
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: true,
      index: true,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 64,
    },
    barcode: { type: String, trim: true, maxlength: 80, default: "" },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    category: { type: String, trim: true, maxlength: 80, default: "General" },
    unit: { type: String, trim: true, maxlength: 24, default: "each" },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    reorderPoint: { type: Number, min: 0, default: 0 },
    unitCost: { type: Number, min: 0, default: 0 },
    isPerishable: { type: Boolean, default: false },
    expiryDate: { type: Date, default: null },
    batchNumber: { type: String, trim: true, maxlength: 80, default: "" },
    dataSource: { type: String, default: "user-entered" },
  },
  { timestamps: true, versionKey: false },
);

inventoryItemSchema.index(
  { ownerId: 1, warehouseId: 1, sku: 1 },
  { unique: true },
);
inventoryItemSchema.index({ ownerId: 1, name: "text", sku: "text" });

export const InventoryItem = mongoose.model(
  "InventoryItem",
  inventoryItemSchema,
);
