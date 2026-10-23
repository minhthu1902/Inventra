import { InventoryItem } from "../models/InventoryItem.js";
import { Location } from "../models/Location.js";
import { Transaction } from "../models/Transaction.js";
import { Warehouse } from "../models/Warehouse.js";

const DATA_SOURCE = "synthetic-demo";

function daysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export async function createInvestigatorDemoData(request, response) {
  const ownerId = request.auth.userId;
  if (await InventoryItem.exists({ ownerId })) {
    return response.status(409).json({
      message: "Demo data can only be added to an account with no inventory items.",
    });
  }

  const created = { warehouse: null, location: null, itemIds: [], transactionIds: [] };
  try {
    const warehouse = await Warehouse.create({
      ownerId,
      name: "Investigator Demo Warehouse",
      code: `AI-DEMO-${String(ownerId).slice(-10)}`,
      address: "Synthetic demo location",
      capacityUnits: 500,
      dataSource: DATA_SOURCE,
    });
    created.warehouse = warehouse;

    const location = await Location.create({
      ownerId,
      warehouseId: warehouse._id,
      code: "AI-DEMO-A1",
      zone: "General",
      capacityUnits: 500,
      dataSource: DATA_SOURCE,
    });
    created.location = location;

    const items = await InventoryItem.create([
      {
        ownerId,
        warehouseId: warehouse._id,
        locationId: location._id,
        sku: "DEMO-VALVE-001",
        name: "Steel Valve",
        category: "Components",
        unit: "each",
        quantity: 4,
        reorderPoint: 10,
        unitCost: 18.5,
        dataSource: DATA_SOURCE,
      },
      {
        ownerId,
        warehouseId: warehouse._id,
        locationId: location._id,
        sku: "DEMO-PUMP-002",
        name: "Transfer Pump",
        category: "Equipment",
        unit: "each",
        quantity: 18,
        reorderPoint: 8,
        unitCost: 74,
        dataSource: DATA_SOURCE,
      },
    ]);
    created.itemIds = items.map((item) => item._id);

    const [valve, pump] = items;
    const transactionDocuments = [
      {
        ownerId,
        inventoryItemId: valve._id,
        warehouseId: warehouse._id,
        locationId: location._id,
        type: "inbound",
        quantity: 60,
        stockBefore: 0,
        stockAfter: 60,
        reference: "DEMO-OPEN-VALVE",
        note: "Synthetic demo opening stock; not real retailer data.",
        performedBy: ownerId,
        dataSource: DATA_SOURCE,
        createdAt: daysAgo(28),
        updatedAt: daysAgo(28),
      },
      {
        ownerId,
        inventoryItemId: valve._id,
        warehouseId: warehouse._id,
        locationId: location._id,
        type: "outbound",
        quantity: 7,
        stockBefore: 60,
        stockAfter: 53,
        reference: "DEMO-SHIP-VALVE-01",
        note: "Synthetic demo transaction; not real retailer data.",
        performedBy: ownerId,
        dataSource: DATA_SOURCE,
        createdAt: daysAgo(8),
        updatedAt: daysAgo(8),
      },
      {
        ownerId,
        inventoryItemId: valve._id,
        warehouseId: warehouse._id,
        locationId: location._id,
        type: "outbound",
        quantity: 49,
        stockBefore: 53,
        stockAfter: 4,
        reference: "DEMO-SHIP-VALVE-02",
        note: "Synthetic demo transaction; intentionally unusual for Investigator demo.",
        performedBy: ownerId,
        dataSource: DATA_SOURCE,
        createdAt: daysAgo(1),
        updatedAt: daysAgo(1),
      },
      {
        ownerId,
        inventoryItemId: pump._id,
        warehouseId: warehouse._id,
        locationId: location._id,
        type: "inbound",
        quantity: 30,
        stockBefore: 0,
        stockAfter: 30,
        reference: "DEMO-OPEN-PUMP",
        note: "Synthetic demo opening stock; not real retailer data.",
        performedBy: ownerId,
        dataSource: DATA_SOURCE,
        createdAt: daysAgo(20),
        updatedAt: daysAgo(20),
      },
      {
        ownerId,
        inventoryItemId: pump._id,
        warehouseId: warehouse._id,
        locationId: location._id,
        type: "outbound",
        quantity: 12,
        stockBefore: 30,
        stockAfter: 18,
        reference: "DEMO-SHIP-PUMP-01",
        note: "Synthetic demo transaction; not real retailer data.",
        performedBy: ownerId,
        dataSource: DATA_SOURCE,
        createdAt: daysAgo(3),
        updatedAt: daysAgo(3),
      },
    ].map((transaction) => new Transaction(transaction));
    created.transactionIds = transactionDocuments.map((transaction) => transaction._id);
    await Transaction.insertMany(transactionDocuments);

    return response.status(201).json({
      message: "Synthetic demo inventory was added. It is not real retailer data.",
      itemsCreated: items.length,
      transactionsCreated: transactionDocuments.length,
    });
  } catch (error) {
    if (created.transactionIds.length) {
      await Transaction.deleteMany({ _id: { $in: created.transactionIds }, ownerId });
    }
    if (created.itemIds.length) {
      await InventoryItem.deleteMany({ _id: { $in: created.itemIds }, ownerId });
    }
    if (created.location) await Location.deleteOne({ _id: created.location._id, ownerId });
    if (created.warehouse) await Warehouse.deleteOne({ _id: created.warehouse._id, ownerId });
    if (error?.code === 11000) {
      return response.status(409).json({
        message: "Demo data has already been added to this account.",
      });
    }
    throw error;
  }
}
