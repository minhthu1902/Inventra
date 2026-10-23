import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    inventoryItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
      index: true,
    },
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: true,
    },
    destinationInventoryItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryItem",
      default: null,
    },
    destinationWarehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      default: null,
    },
    destinationLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      default: null,
    },
    type: {
      type: String,
      enum: ["inbound", "outbound", "adjustment", "transfer"],
      required: true,
    },
    adjustmentDirection: {
      type: String,
      enum: ["increase", "decrease"],
      default: null,
    },
    quantity: { type: Number, required: true, min: 1 },
    stockBefore: { type: Number, required: true, min: 0 },
    stockAfter: { type: Number, required: true, min: 0 },
    reference: { type: String, trim: true, maxlength: 80, default: "" },
    note: { type: String, trim: true, maxlength: 500, default: "" },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    dataSource: { type: String, default: "user-entered" },
    clientOperationId: { type: String, maxlength: 64 },
  },
  { timestamps: true, versionKey: false },
);

transactionSchema.index({ ownerId: 1, createdAt: -1 });
transactionSchema.index(
  { ownerId: 1, clientOperationId: 1 },
  {
    unique: true,
    partialFilterExpression: { clientOperationId: { $type: "string" } },
  },
);

export const Transaction = mongoose.model("Transaction", transactionSchema);
