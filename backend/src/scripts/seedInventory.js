import mongoose from "mongoose";
import { env } from "../config/env.js";
import { InventoryItem } from "../models/InventoryItem.js";
import { Location } from "../models/Location.js";
import { Transaction } from "../models/Transaction.js";
import { User } from "../models/User.js";
import { Warehouse } from "../models/Warehouse.js";

const DATA_SOURCE = "synthetic-demo";

const products = [
  {
    sku: "HEB-DAI-001",
    name: "Whole Milk 1 gal",
    category: "Dairy",
    unit: "each",
    quantity: 84,
    reorderPoint: 24,
    unitCost: 3.48,
    isPerishable: true,
    expiryDays: 9,
  },
  {
    sku: "HEB-DAI-002",
    name: "Large Grade A Eggs 12 ct",
    category: "Dairy",
    unit: "carton",
    quantity: 62,
    reorderPoint: 18,
    unitCost: 3.96,
    isPerishable: true,
    expiryDays: 16,
  },
  {
    sku: "HEB-PRD-001",
    name: "Avocados Hass",
    category: "Produce",
    unit: "each",
    quantity: 118,
    reorderPoint: 30,
    unitCost: 0.78,
    isPerishable: true,
    expiryDays: 5,
  },
  {
    sku: "HEB-PRD-002",
    name: "Strawberries 1 lb",
    category: "Produce",
    unit: "clamshell",
    quantity: 17,
    reorderPoint: 20,
    unitCost: 4.28,
    isPerishable: true,
    expiryDays: 4,
  },
  {
    sku: "HEB-MEA-001",
    name: "Ground Beef 80/20 1 lb",
    category: "Meat",
    unit: "pack",
    quantity: 39,
    reorderPoint: 16,
    unitCost: 5.98,
    isPerishable: true,
    expiryDays: 7,
  },
  {
    sku: "HEB-BAK-001",
    name: "Whole Wheat Sandwich Bread",
    category: "Bakery",
    unit: "loaf",
    quantity: 26,
    reorderPoint: 14,
    unitCost: 3.24,
    isPerishable: true,
    expiryDays: 6,
  },
  {
    sku: "HEB-PAN-001",
    name: "Pinto Beans 1 lb",
    category: "Pantry",
    unit: "bag",
    quantity: 145,
    reorderPoint: 35,
    unitCost: 1.48,
  },
  {
    sku: "HEB-PAN-002",
    name: "Long Grain Rice 5 lb",
    category: "Pantry",
    unit: "bag",
    quantity: 71,
    reorderPoint: 20,
    unitCost: 5.96,
  },
  {
    sku: "HEB-FRZ-001",
    name: "Mixed Vegetables 16 oz",
    category: "Frozen",
    unit: "bag",
    quantity: 53,
    reorderPoint: 18,
    unitCost: 2.48,
    isPerishable: true,
    expiryDays: 240,
  },
  {
    sku: "HEB-BEV-001",
    name: "Orange Juice 59 oz",
    category: "Beverages",
    unit: "carton",
    quantity: 33,
    reorderPoint: 15,
    unitCost: 4.18,
    isPerishable: true,
    expiryDays: 21,
  },
  {
    sku: "HEB-CLN-001",
    name: "Dish Soap 24 oz",
    category: "Household",
    unit: "bottle",
    quantity: 48,
    reorderPoint: 12,
    unitCost: 3.68,
  },
  {
    sku: "HEB-SNK-001",
    name: "Tortilla Chips 13 oz",
    category: "Snacks",
    unit: "bag",
    quantity: 9,
    reorderPoint: 16,
    unitCost: 3.28,
  },
];

function daysAgo(days, hour = 12) {
  const date = new Date();
  date.setUTCHours(hour, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

async function seed() {
  const email = process.env.SEED_USER_EMAIL?.trim().toLowerCase();
  if (!email)
    throw new Error(
      "Set SEED_USER_EMAIL to an existing verified account email.",
    );

  await mongoose.connect(env.MONGODB_URI, { appName: "inventra-seed" });
  const user = await User.findOne({ email });
  if (!user)
    throw new Error(`No account exists for ${email}. Sign up before seeding.`);
  if (!user.emailVerified)
    throw new Error(`Account ${email} must verify its email before seeding.`);

  const ownerId = user._id;
  await Transaction.deleteMany({ ownerId, dataSource: DATA_SOURCE });
  await InventoryItem.deleteMany({ ownerId, dataSource: DATA_SOURCE });

  const [north, south] = await Promise.all(
    [
      {
        ownerId,
        name: "North Austin Market",
        code: "DEMO-AUS-N",
        address: "Austin, TX (synthetic demo)",
        capacityUnits: 1800,
        dataSource: DATA_SOURCE,
      },
      {
        ownerId,
        name: "South Austin Market",
        code: "DEMO-AUS-S",
        address: "Austin, TX (synthetic demo)",
        capacityUnits: 1500,
        dataSource: DATA_SOURCE,
      },
    ].map((warehouse) =>
      Warehouse.findOneAndUpdate(
        { ownerId, code: warehouse.code },
        { $set: warehouse },
        {
          upsert: true,
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        },
      ),
    ),
  );
  const [northProduce, northCooler, southPantry] = await Promise.all(
    [
      {
        ownerId,
        warehouseId: north._id,
        code: "DEMO-A1-01",
        zone: "Produce",
        capacityUnits: 450,
      },
      {
        ownerId,
        warehouseId: north._id,
        code: "DEMO-B2-03",
        zone: "Cooler",
        capacityUnits: 700,
      },
      {
        ownerId,
        warehouseId: south._id,
        code: "DEMO-C1-02",
        zone: "Pantry",
        capacityUnits: 800,
      },
    ].map((location) =>
      Location.findOneAndUpdate(
        { ownerId, warehouseId: location.warehouseId, code: location.code },
        { $set: { ...location, dataSource: DATA_SOURCE } },
        {
          upsert: true,
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        },
      ),
    ),
  );

  const items = await InventoryItem.create(
    products.map((product, index) => {
      const warehouse = index < 6 ? north : south;
      const location =
        index < 3 ? northProduce : index < 6 ? northCooler : southPantry;
      return {
        ownerId,
        warehouseId: warehouse._id,
        locationId: location._id,
        sku: product.sku,
        name: product.name,
        category: product.category,
        unit: product.unit,
        quantity: product.quantity,
        reorderPoint: product.reorderPoint,
        unitCost: product.unitCost,
        isPerishable: product.isPerishable ?? false,
        expiryDate: product.expiryDays
          ? new Date(Date.now() + product.expiryDays * 86400000)
          : null,
        batchNumber: product.isPerishable ? `DEMO-${product.sku}-01` : "",
        dataSource: DATA_SOURCE,
      };
    }),
  );

  const transactions = [];
  for (const [index, item] of items.entries()) {
    const finalStock = item.quantity;
    const planned =
      index % 4 === 1
        ? [
            { type: "inbound", quantity: 10, days: 0, hour: 9 },
            { type: "outbound", quantity: 6, days: 0, hour: 14 },
          ]
        : index % 4 === 2
          ? [
              { type: "outbound", quantity: 5, days: 5, hour: 11 },
              { type: "inbound", quantity: 5, days: 2, hour: 10 },
            ]
          : index % 4 === 0
            ? [
                { type: "outbound", quantity: 3, days: 7, hour: 13 },
                { type: "inbound", quantity: 3, days: 3, hour: 10 },
              ]
            : [];
    const netMovement = planned.reduce(
      (sum, entry) =>
        sum + (entry.type === "inbound" ? entry.quantity : -entry.quantity),
      0,
    );
    const openingStock = finalStock - netMovement;
    let stock = 0;

    if (openingStock > 0) {
      transactions.push({
        ownerId,
        inventoryItemId: item._id,
        warehouseId: item.warehouseId,
        locationId: item.locationId,
        type: "inbound",
        quantity: openingStock,
        stockBefore: 0,
        stockAfter: openingStock,
        reference: `SEED-${item.sku}`,
        note: "Synthetic demo opening stock; not HEB/Walmart operational data",
        performedBy: ownerId,
        dataSource: DATA_SOURCE,
        createdAt: daysAgo(30),
        updatedAt: daysAgo(30),
      });
      stock = openingStock;
    }

    for (const entry of planned) {
      const before = stock;
      stock += entry.type === "inbound" ? entry.quantity : -entry.quantity;
      transactions.push({
        ownerId,
        inventoryItemId: item._id,
        warehouseId: item.warehouseId,
        locationId: item.locationId,
        type: entry.type,
        quantity: entry.quantity,
        stockBefore: before,
        stockAfter: stock,
        reference: `DEMO-${item.sku}`,
        note: "Synthetic demo transaction; not HEB/Walmart operational data",
        performedBy: ownerId,
        dataSource: DATA_SOURCE,
        createdAt: daysAgo(entry.days, entry.hour),
        updatedAt: daysAgo(entry.days, entry.hour),
      });
    }
  }

  await Transaction.insertMany(transactions);
  console.info(
    `Seeded ${items.length} synthetic items and ${transactions.length} transactions for ${email}.`,
  );
}

seed()
  .catch((error) => {
    console.error("Inventory seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
