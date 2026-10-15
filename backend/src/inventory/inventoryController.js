import mongoose from "mongoose";
import { InventoryItem } from "../models/InventoryItem.js";
import { Location } from "../models/Location.js";
import { Transaction } from "../models/Transaction.js";
import { Warehouse } from "../models/Warehouse.js";
import {
  calculateStockMovement,
  createInventoryItemSchema,
  createLocationSchema,
  createWarehouseSchema,
  inventoryQuerySchema,
  stockMovementSchema,
  transactionQuerySchema,
  updateInventoryItemSchema,
} from "./inventorySchemas.js";

function rejectValidation(response, result) {
  return response.status(400).json({
    message: "Request validation failed",
    errors: result.error.issues.map(({ path, message }) => ({
      path: path.join("."),
      message,
    })),
  });
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function invalidReference(response, message) {
  return response.status(400).json({ message });
}

export async function listWarehouses(request, response) {
  const warehouses = await Warehouse.find({ ownerId: request.auth.userId })
    .sort({ name: 1 })
    .lean();
  return response.status(200).json({ warehouses });
}

export async function createWarehouse(request, response) {
  const parsed = createWarehouseSchema.safeParse(request.body);
  if (!parsed.success) return rejectValidation(response, parsed);

  const warehouse = await Warehouse.create({
    ...parsed.data,
    ownerId: request.auth.userId,
  });
  return response.status(201).json({ warehouse });
}

export async function listWarehouseLocations(request, response) {
  if (!mongoose.isValidObjectId(request.params.warehouseId)) {
    return invalidReference(response, "Invalid warehouse id");
  }
  const warehouse = await Warehouse.exists({
    _id: request.params.warehouseId,
    ownerId: request.auth.userId,
  });
  if (!warehouse)
    return response.status(404).json({ message: "Warehouse not found" });

  const locations = await Location.find({
    ownerId: request.auth.userId,
    warehouseId: request.params.warehouseId,
  })
    .sort({ code: 1 })
    .lean();
  return response.status(200).json({ locations });
}

export async function createLocation(request, response) {
  const parsed = createLocationSchema.safeParse(request.body);
  if (!parsed.success) return rejectValidation(response, parsed);

  const warehouse = await Warehouse.exists({
    _id: parsed.data.warehouseId,
    ownerId: request.auth.userId,
  });
  if (!warehouse)
    return invalidReference(
      response,
      "Warehouse is not available to this user",
    );

  const location = await Location.create({
    ...parsed.data,
    ownerId: request.auth.userId,
  });
  return response.status(201).json({ location });
}

export async function listInventory(request, response) {
  const parsed = inventoryQuerySchema.safeParse(request.query);
  if (!parsed.success) return rejectValidation(response, parsed);
  const { search, category, warehouseId, stockStatus, page, limit } =
    parsed.data;
  const filter = { ownerId: request.auth.userId };

  if (category) filter.category = category;
  if (warehouseId) filter.warehouseId = warehouseId;
  if (search) {
    const pattern = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ sku: pattern }, { name: pattern }, { category: pattern }];
  }
  if (stockStatus === "out") filter.quantity = 0;
  if (stockStatus === "low") {
    filter.$expr = {
      $and: [
        { $gt: ["$quantity", 0] },
        { $lte: ["$quantity", "$reorderPoint"] },
      ],
    };
  }

  const [items, total] = await Promise.all([
    InventoryItem.find(filter)
      .populate("warehouseId", "name code")
      .populate("locationId", "code zone")
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    InventoryItem.countDocuments(filter),
  ]);

  return response.status(200).json({
    items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

export async function getInventoryItem(request, response) {
  if (!mongoose.isValidObjectId(request.params.itemId)) {
    return invalidReference(response, "Invalid inventory item id");
  }
  const item = await InventoryItem.findOne({
    _id: request.params.itemId,
    ownerId: request.auth.userId,
  })
    .populate("warehouseId", "name code")
    .populate("locationId", "code zone")
    .lean();
  if (!item)
    return response.status(404).json({ message: "Inventory item not found" });
  return response.status(200).json({ item });
}

export async function createInventoryItem(request, response) {
  const parsed = createInventoryItemSchema.safeParse(request.body);
  if (!parsed.success) return rejectValidation(response, parsed);
  const ownerId = request.auth.userId;

  const [warehouse, location] = await Promise.all([
    Warehouse.exists({ _id: parsed.data.warehouseId, ownerId }),
    Location.exists({
      _id: parsed.data.locationId,
      warehouseId: parsed.data.warehouseId,
      ownerId,
    }),
  ]);
  if (!warehouse || !location) {
    return invalidReference(
      response,
      "Warehouse or location is not available to this user",
    );
  }

  const item = await InventoryItem.create({
    ...parsed.data,
    ownerId,
    dataSource: "user-entered",
  });
  if (item.quantity > 0) {
    try {
      await Transaction.create({
        ownerId,
        inventoryItemId: item.id,
        warehouseId: item.warehouseId,
        locationId: item.locationId,
        type: "inbound",
        quantity: item.quantity,
        stockBefore: 0,
        stockAfter: item.quantity,
        reference: "OPENING-STOCK",
        note: "Opening stock",
        performedBy: ownerId,
        dataSource: "user-entered",
      });
    } catch (error) {
      await InventoryItem.deleteOne({ _id: item.id, ownerId });
      throw error;
    }
  }
  return response.status(201).json({ item });
}

export async function updateInventoryItem(request, response) {
  if (!mongoose.isValidObjectId(request.params.itemId)) {
    return invalidReference(response, "Invalid inventory item id");
  }
  const parsed = updateInventoryItemSchema.safeParse(request.body);
  if (!parsed.success) return rejectValidation(response, parsed);

  const item = await InventoryItem.findOneAndUpdate(
    { _id: request.params.itemId, ownerId: request.auth.userId },
    { $set: parsed.data },
    { new: true, runValidators: true },
  ).lean();
  if (!item)
    return response.status(404).json({ message: "Inventory item not found" });
  return response.status(200).json({ item });
}

export async function createStockMovement(request, response) {
  if (!mongoose.isValidObjectId(request.params.itemId)) {
    return invalidReference(response, "Invalid inventory item id");
  }
  const parsed = stockMovementSchema.safeParse(request.body);
  if (!parsed.success) return rejectValidation(response, parsed);

  const ownerId = request.auth.userId;
  const { type, direction, quantity, reference, note } = parsed.data;
  const movementDirection =
    type === "inbound" || (type === "adjustment" && direction === "increase")
      ? "increase"
      : "decrease";
  const sign = movementDirection === "increase" ? 1 : -1;
  const filter = { _id: request.params.itemId, ownerId };
  if (sign < 0) filter.quantity = { $gte: quantity };

  const item = await InventoryItem.findOneAndUpdate(
    filter,
    { $inc: { quantity: sign * quantity } },
    { new: true, runValidators: true },
  );
  if (!item) {
    const ownedItem = await InventoryItem.exists({
      _id: request.params.itemId,
      ownerId,
    });
    if (!ownedItem)
      return response.status(404).json({ message: "Inventory item not found" });
    return response
      .status(409)
      .json({ message: "Insufficient stock for this outbound movement" });
  }

  const movement = calculateStockMovement(
    item.quantity - sign * quantity,
    type,
    quantity,
    direction,
  );
  try {
    const transaction = await Transaction.create({
      ownerId,
      inventoryItemId: item.id,
      warehouseId: item.warehouseId,
      locationId: item.locationId,
      type,
      adjustmentDirection: type === "adjustment" ? direction : null,
      quantity,
      stockBefore: movement.stockBefore,
      stockAfter: movement.stockAfter,
      reference,
      note,
      performedBy: ownerId,
      dataSource: "user-entered",
    });
    return response.status(201).json({ item, transaction });
  } catch (error) {
    await InventoryItem.updateOne(
      { _id: request.params.itemId, ownerId },
      { $inc: { quantity: -sign * quantity } },
    );
    throw error;
  }
}

export async function listTransactions(request, response) {
  const parsed = transactionQuerySchema.safeParse(request.query);
  if (!parsed.success) return rejectValidation(response, parsed);
  const { type, inventoryItemId, page, limit } = parsed.data;
  const filter = { ownerId: request.auth.userId };
  if (type) filter.type = type;
  if (inventoryItemId) filter.inventoryItemId = inventoryItemId;

  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .populate("inventoryItemId", "sku name unit")
      .populate("warehouseId", "name code")
      .populate("locationId", "code")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Transaction.countDocuments(filter),
  ]);

  return response.status(200).json({
    transactions,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
