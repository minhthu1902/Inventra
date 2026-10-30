import mongoose from "mongoose";

const locationSchema = new mongoose.Schema(
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
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 40,
    },
    zone: { type: String, trim: true, maxlength: 80, default: "" },
    capacityUnits: { type: Number, min: 0, default: 0 },
    dataSource: { type: String, default: "user-entered" },
  },
  { timestamps: true, versionKey: false },
);

locationSchema.index({ ownerId: 1, warehouseId: 1, code: 1 }, { unique: true });

export const Location = mongoose.model("Location", locationSchema);
