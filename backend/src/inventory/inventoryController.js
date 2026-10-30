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
  inventoryTransferSchema,
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
    filter.$or = [
      { sku: pattern },
      { barcode: pattern },
      { name: pattern },
      { category: pattern },
    ];
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

export async function deleteInventoryItem(request, response) {
  if (!mongoose.isValidObjectId(request.params.itemId)) {
    return invalidReference(response, "Invalid inventory item id");
  }
  const ownerId = request.auth.userId;
  const item = await InventoryItem.findOne({ _id: request.params.itemId, ownerId });
  if (!item)
    return response.status(404).json({ message: "Inventory item not found" });

  // Write off remaining stock first so history and stock trends stay consistent
  let writeOff = null;
  if (item.quantity > 0) {
    writeOff = await Transaction.create({
      ownerId,
      inventoryItemId: item._id,
      warehouseId: item.warehouseId,
      locationId: item.locationId,
      type: "adjustment",
      adjustmentDirection: "decrease",
      quantity: item.quantity,
      stockBefore: item.quantity,
      stockAfter: 0,
      reference: "ITEM-REMOVED",
      note: `${item.sku} · ${item.name} removed from inventory`,
      performedBy: ownerId,
      dataSource: "user-entered",
    });
  }

  const deleted = await InventoryItem.deleteOne({
    _id: item._id,
    ownerId,
    quantity: item.quantity,
  });
  if (deleted.deletedCount === 0) {
    if (writeOff) await Transaction.deleteOne({ _id: writeOff._id, ownerId });
    return response.status(409).json({
      message: "Stock changed while removing this item. Refresh and try again.",
    });
  }
  return response.status(200).json({
    deletedItemId: String(item._id),
    removedQuantity: item.quantity,
  });
}

export async function createStockMovement(request, response) {
  if (!mongoose.isValidObjectId(request.params.itemId)) {
    return invalidReference(response, "Invalid inventory item id");
  }
  const parsed = stockMovementSchema.safeParse(request.body);
  if (!parsed.success) return rejectValidation(response, parsed);

  const ownerId = request.auth.userId;
  const { type, direction, quantity, reference, note, clientOperationId } =
    parsed.data;
  if (clientOperationId) {
    const existing = await Transaction.findOne({ ownerId, clientOperationId });
    if (existing) {
      if (String(existing.inventoryItemId) !== request.params.itemId || existing.type !== type || existing.quantity !== quantity) {
        return response.status(409).json({ message: "This offline operation ID was already used for a different movement." });
      }
      const currentItem = await InventoryItem.findOne({
        _id: request.params.itemId,
        ownerId,
      });
      return response.status(200).json({
        item: currentItem,
        transaction: existing,
        replayed: true,
      });
    }
  }
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
      ...(clientOperationId ? { clientOperationId } : {}),
    });
    return response.status(201).json({ item, transaction });
  } catch (error) {
    await InventoryItem.updateOne(
      { _id: request.params.itemId, ownerId },
      { $inc: { quantity: -sign * quantity } },
    );
    if (error?.code === 11000 && clientOperationId) {
      const [transaction, currentItem] = await Promise.all([
        Transaction.findOne({ ownerId, clientOperationId }),
        InventoryItem.findOne({ _id: request.params.itemId, ownerId }),
      ]);
      if (transaction) {
        return response
          .status(200)
          .json({ item: currentItem, transaction, replayed: true });
      }
    }
    throw error;
  }
}

export async function transferInventory(request, response) {
  if (!mongoose.isValidObjectId(request.params.itemId)) {
    return invalidReference(response, "Invalid inventory item id");
  }
  const parsed = inventoryTransferSchema.safeParse(request.body);
  if (!parsed.success) return rejectValidation(response, parsed);

  const ownerId = request.auth.userId;
  const { destinationWarehouseId, destinationLocationId, quantity, reference, note, clientOperationId } = parsed.data;
  const sourceFilter = { _id: request.params.itemId, ownerId };

  if (clientOperationId) {
    const existing = await Transaction.findOne({ ownerId, clientOperationId });
    if (existing) {
      if (existing.type !== "transfer" || String(existing.inventoryItemId) !== request.params.itemId || existing.quantity !== quantity || String(existing.destinationWarehouseId) !== destinationWarehouseId || String(existing.destinationLocationId) !== destinationLocationId) {
        return response.status(409).json({ message: "This offline operation ID was already used for a different movement." });
      }
      const [sourceItem, destinationItem] = await Promise.all([
        InventoryItem.findOne({ _id: existing.inventoryItemId, ownerId }),
        InventoryItem.findOne({ _id: existing.destinationInventoryItemId, ownerId }),
      ]);
      return response.status(200).json({ sourceItem, destinationItem, transaction: existing, replayed: true });
    }
  }

  const source = await InventoryItem.findOneAndUpdate(
    { ...sourceFilter, quantity: { $gte: quantity } },
    { $inc: { quantity: -quantity } },
    { new: true, runValidators: true },
  );
  if (!source) {
    const exists = await InventoryItem.exists(sourceFilter);
    if (!exists) return response.status(404).json({ message: "Inventory item not found" });
    return response.status(409).json({ message: "Insufficient stock for this transfer" });
  }

  let destinationItem = null;
  let destinationAdded = false;
  let destinationCreated = false;
  let destinationLocation = null;
  try {
    const [warehouse, location] = await Promise.all([
      Warehouse.findOne({ _id: destinationWarehouseId, ownerId }),
      Location.findOne({ _id: destinationLocationId, warehouseId: destinationWarehouseId, ownerId }),
    ]);
    if (!warehouse || !location) {
      await InventoryItem.updateOne(sourceFilter, { $inc: { quantity } });
      return invalidReference(response, "Destination warehouse or location is not available to this user");
    }
    if (String(source.warehouseId) === String(destinationWarehouseId)) {
      await InventoryItem.updateOne(sourceFilter, { $inc: { quantity } });
      return response.status(400).json({ message: "Choose another warehouse for a transfer." });
    }

    destinationItem = await InventoryItem.findOne({ ownerId, warehouseId: destinationWarehouseId, sku: source.sku });
    if (destinationItem) {
      if (String(destinationItem.locationId) !== String(destinationLocationId)) {
        await InventoryItem.updateOne(sourceFilter, { $inc: { quantity } });
        return response.status(409).json({ message: "This SKU already uses another location in the destination warehouse. Choose that location." });
      }
      destinationItem = await InventoryItem.findOneAndUpdate(
        { _id: destinationItem._id, ownerId },
        { $inc: { quantity } },
        { new: true, runValidators: true },
      );
      destinationAdded = true;
    } else {
      try {
        destinationItem = await InventoryItem.create({
          ownerId,
          warehouseId: destinationWarehouseId,
          locationId: destinationLocationId,
          sku: source.sku,
          barcode: source.barcode,
          name: source.name,
          category: source.category,
          unit: source.unit,
          quantity,
          reorderPoint: source.reorderPoint,
          unitCost: source.unitCost,
          isPerishable: source.isPerishable,
          expiryDate: source.expiryDate,
          batchNumber: source.batchNumber,
          dataSource: "user-entered",
        });
        destinationCreated = true;
        destinationAdded = true;
      } catch (error) {
        if (error?.code !== 11000) throw error;
        const racedDestination = await InventoryItem.findOne({ ownerId, warehouseId: destinationWarehouseId, sku: source.sku });
        if (!racedDestination || String(racedDestination.locationId) !== String(destinationLocationId)) {
          const conflict = new Error("This SKU was added to a different destination location during the transfer.");
          conflict.status = 409;
          throw conflict;
        }
        destinationItem = await InventoryItem.findOneAndUpdate(
          { _id: racedDestination._id, ownerId },
          { $inc: { quantity } },
          { new: true, runValidators: true },
        );
        destinationAdded = true;
      }
    }
    destinationLocation = location;

    const transaction = await Transaction.create({
      ownerId,
      inventoryItemId: source._id,
      warehouseId: source.warehouseId,
      locationId: source.locationId,
      destinationInventoryItemId: destinationItem._id,
      destinationWarehouseId,
      destinationLocationId,
      type: "transfer",
      quantity,
      stockBefore: source.quantity + quantity,
      stockAfter: source.quantity,
      reference,
      note,
      performedBy: ownerId,
      dataSource: "user-entered",
      ...(clientOperationId ? { clientOperationId } : {}),
    });
    return response.status(201).json({
      sourceItem: source,
      destinationItem,
      transaction: {
        ...transaction.toObject(),
        destinationWarehouse: warehouse,
        destinationLocation,
      },
    });
  } catch (error) {
    if (destinationAdded && destinationItem) {
      if (destinationCreated) {
        await InventoryItem.deleteOne({ _id: destinationItem._id, ownerId, quantity });
      } else {
        await InventoryItem.updateOne({ _id: destinationItem._id, ownerId }, { $inc: { quantity: -quantity } });
      }
    }
    await InventoryItem.updateOne(sourceFilter, { $inc: { quantity } });
    if (error?.code === 11000 && clientOperationId) {
      const existing = await Transaction.findOne({ ownerId, clientOperationId });
      if (existing) {
        const [sourceItem, targetItem] = await Promise.all([
          InventoryItem.findOne({ _id: existing.inventoryItemId, ownerId }),
          InventoryItem.findOne({ _id: existing.destinationInventoryItemId, ownerId }),
        ]);
        return response.status(200).json({ sourceItem, destinationItem: targetItem, transaction: existing, replayed: true });
      }
    }
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
      .populate("destinationInventoryItemId", "sku name unit")
      .populate("destinationWarehouseId", "name code")
      .populate("destinationLocationId", "code")
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
