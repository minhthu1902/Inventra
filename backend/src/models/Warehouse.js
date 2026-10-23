import mongoose from "mongoose";

const warehouseSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 32,
    },
    address: { type: String, trim: true, maxlength: 240, default: "" },
    capacityUnits: { type: Number, min: 0, default: 0 },
    dataSource: { type: String, default: "user-entered" },
  },
  { timestamps: true, versionKey: false },
);

warehouseSchema.index({ ownerId: 1, code: 1 }, { unique: true });

export const Warehouse = mongoose.model("Warehouse", warehouseSchema);
