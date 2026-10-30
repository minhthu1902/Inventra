import { InventoryItem } from "../models/InventoryItem.js";
import { Location } from "../models/Location.js";
import { Transaction } from "../models/Transaction.js";
import { Warehouse } from "../models/Warehouse.js";

export const DATA_SOURCE = "synthetic-demo";

const HOUR_MS = 60 * 60 * 1000;

const warehouses = [
  { key: "north", name: "North Austin Market", code: "DEMO-AUS-N", capacityUnits: 1800 },
  { key: "south", name: "South Austin Market", code: "DEMO-AUS-S", capacityUnits: 1500 },
];

const locations = [
  { key: "produce", warehouse: "north", code: "DEMO-A1-01", zone: "Produce", capacityUnits: 450 },
  { key: "cooler", warehouse: "north", code: "DEMO-B2-03", zone: "Cooler", capacityUnits: 700 },
  { key: "pantry", warehouse: "south", code: "DEMO-C1-02", zone: "Pantry", capacityUnits: 800 },
];

// Movements are listed oldest first as [type, quantity, hoursAgo]; the opening stock is derived from them.
// Strawberries and tortilla chips carry deliberate anomalies for the AI Investigator to find.
const products = [
  { sku: "DEMO-DAI-001", name: "Whole Milk 1 gal", category: "Dairy", unit: "each", quantity: 84, reorderPoint: 24, unitCost: 3.48, expiryDays: 9, location: "produce", movements: [["outbound", 3, 168], ["inbound", 3, 72]] },
  { sku: "DEMO-DAI-002", name: "Large Grade A Eggs 12 ct", category: "Dairy", unit: "carton", quantity: 62, reorderPoint: 18, unitCost: 3.96, expiryDays: 16, location: "produce", movements: [["inbound", 10, 30], ["outbound", 6, 26]] },
  { sku: "DEMO-PRD-001", name: "Avocados Hass", category: "Produce", unit: "each", quantity: 118, reorderPoint: 30, unitCost: 0.78, expiryDays: 5, location: "produce", movements: [["outbound", 5, 120], ["inbound", 5, 48]] },
  { sku: "DEMO-PRD-002", name: "Strawberries 1 lb", category: "Produce", unit: "clamshell", quantity: 17, reorderPoint: 20, unitCost: 4.28, expiryDays: 4, location: "produce", movements: [["outbound", 4, 240], ["outbound", 6, 20], ["outbound", 5, 12], ["outbound", 7, 4]] },
  { sku: "DEMO-MEA-001", name: "Ground Beef 80/20 1 lb", category: "Meat", unit: "pack", quantity: 39, reorderPoint: 16, unitCost: 5.98, expiryDays: 7, location: "cooler", movements: [["outbound", 3, 168], ["inbound", 3, 72]] },
  { sku: "DEMO-BAK-001", name: "Whole Wheat Sandwich Bread", category: "Bakery", unit: "loaf", quantity: 26, reorderPoint: 14, unitCost: 3.24, expiryDays: 6, location: "cooler", movements: [["inbound", 10, 30], ["outbound", 6, 26]] },
  { sku: "DEMO-PAN-001", name: "Pinto Beans 1 lb", category: "Pantry", unit: "bag", quantity: 145, reorderPoint: 35, unitCost: 1.48, location: "pantry", movements: [["outbound", 5, 120], ["inbound", 5, 48]] },
  { sku: "DEMO-PAN-002", name: "Long Grain Rice 5 lb", category: "Pantry", unit: "bag", quantity: 71, reorderPoint: 20, unitCost: 5.96, location: "pantry", movements: [] },
  { sku: "DEMO-FRZ-001", name: "Mixed Vegetables 16 oz", category: "Frozen", unit: "bag", quantity: 53, reorderPoint: 18, unitCost: 2.48, expiryDays: 240, location: "pantry", movements: [["outbound", 3, 168], ["inbound", 3, 72]] },
  { sku: "DEMO-BEV-001", name: "Orange Juice 59 oz", category: "Beverages", unit: "carton", quantity: 33, reorderPoint: 15, unitCost: 4.18, expiryDays: 21, location: "pantry", movements: [["inbound", 10, 30], ["outbound", 6, 26]] },
  { sku: "DEMO-CLN-001", name: "Dish Soap 24 oz", category: "Household", unit: "bottle", quantity: 48, reorderPoint: 12, unitCost: 3.68, location: "pantry", movements: [["outbound", 5, 120], ["inbound", 5, 48]] },
  { sku: "DEMO-SNK-001", name: "Tortilla Chips 13 oz", category: "Snacks", unit: "bag", quantity: 9, reorderPoint: 16, unitCost: 3.28, location: "pantry", movements: [["outbound", 4, 288], ["outbound", 3, 144], ["outbound", 30, 2]] },
];

const OPENING_HOURS_AGO = 29 * 24;

export const syntheticInventorySize = {
  warehouses: warehouses.length,
  locations: locations.length,
  items: products.length,
};

async function upsertTracked(Model, filter, values, createdIds) {
  const result = await Model.findOneAndUpdate(
    filter,
    { $set: { ...values, dataSource: DATA_SOURCE } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true, includeResultMetadata: true },
  );
  if (!result.lastErrorObject?.updatedExisting) createdIds.push(result.value._id);
  return result.value;
}

// Adds the synthetic dataset to one account. Warehouses and locations are reused when they already exist;
// on failure, everything this call created is removed again.
export async function addSyntheticInventory(ownerId) {
  const now = Date.now();
  const at = (hoursAgo) => new Date(now - hoursAgo * HOUR_MS);
  const created = { warehouseIds: [], locationIds: [], itemIds: [], transactionIds: [] };

  try {
    const warehouseByKey = {};
    for (const { key, ...warehouse } of warehouses) {
      warehouseByKey[key] = await upsertTracked(
        Warehouse,
        { ownerId, code: warehouse.code },
        { ...warehouse, ownerId, address: "Austin, TX (synthetic demo)" },
        created.warehouseIds,
      );
    }

    const locationByKey = {};
    for (const { key, warehouse, ...location } of locations) {
      const warehouseId = warehouseByKey[warehouse]._id;
      locationByKey[key] = await upsertTracked(
        Location,
        { ownerId, warehouseId, code: location.code },
        { ...location, ownerId, warehouseId },
        created.locationIds,
      );
    }

    const items = await InventoryItem.create(
      products.map(({ location, movements, expiryDays, ...product }) => ({
        ...product,
        ownerId,
        warehouseId: locationByKey[location].warehouseId,
        locationId: locationByKey[location]._id,
        isPerishable: Boolean(expiryDays),
        expiryDate: expiryDays ? new Date(now + expiryDays * 24 * HOUR_MS) : null,
        batchNumber: expiryDays ? `${product.sku}-B01` : "",
        dataSource: DATA_SOURCE,
      })),
    );
    created.itemIds = items.map((item) => item._id);

    const transactions = [];
    for (const [index, item] of items.entries()) {
      const { movements } = products[index];
      const record = (type, quantity, stockBefore, stockAfter, hoursAgo, reference, note) =>
        new Transaction({
          ownerId,
          inventoryItemId: item._id,
          warehouseId: item.warehouseId,
          locationId: item.locationId,
          type,
          quantity,
          stockBefore,
          stockAfter,
          reference,
          note,
          performedBy: ownerId,
          dataSource: DATA_SOURCE,
          createdAt: at(hoursAgo),
          updatedAt: at(hoursAgo),
        });

      const netMovement = movements.reduce(
        (sum, [type, quantity]) => sum + (type === "inbound" ? quantity : -quantity),
        0,
      );
      let stock = item.quantity - netMovement;
      if (stock > 0) {
        transactions.push(record("inbound", stock, 0, stock, OPENING_HOURS_AGO, `SEED-${item.sku}`, "Synthetic demo opening stock; not real retailer data."));
      }
      movements.forEach(([type, quantity, hoursAgo], step) => {
        const before = stock;
        stock += type === "inbound" ? quantity : -quantity;
        transactions.push(record(type, quantity, before, stock, hoursAgo, `DEMO-${item.sku}-${step + 1}`, "Synthetic demo transaction; not real retailer data."));
      });
    }
    created.transactionIds = transactions.map((transaction) => transaction._id);
    await Transaction.insertMany(transactions);

    return { ...syntheticInventorySize, transactions: transactions.length };
  } catch (error) {
    await Transaction.deleteMany({ _id: { $in: created.transactionIds }, ownerId });
    await InventoryItem.deleteMany({ _id: { $in: created.itemIds }, ownerId });
    // Another request may have placed items in a warehouse or location this call created; keep those
    for (const locationId of created.locationIds) {
      if (!(await InventoryItem.exists({ ownerId, locationId }))) await Location.deleteOne({ _id: locationId, ownerId });
    }
    for (const warehouseId of created.warehouseIds) {
      if (!(await InventoryItem.exists({ ownerId, warehouseId }))) await Warehouse.deleteOne({ _id: warehouseId, ownerId });
    }
    throw error;
  }
}

// Removes earlier synthetic items and transactions so the dataset can be added again
export async function removeSyntheticInventory(ownerId) {
  await Transaction.deleteMany({ ownerId, dataSource: DATA_SOURCE });
  await InventoryItem.deleteMany({ ownerId, dataSource: DATA_SOURCE });
}
