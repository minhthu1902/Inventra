import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateStockMovement,
  createInventoryItemSchema,
  inventoryQuerySchema,
  stockMovementSchema,
} from "../src/inventory/inventorySchemas.js";

test("inventory create schema normalizes identifiers and defaults", () => {
  const result = createInventoryItemSchema.parse({
    warehouseId: "64b000000000000000000001",
    locationId: "64b000000000000000000002",
    sku: " milk-001 ",
    name: " Whole Milk ",
  });

  assert.equal(result.sku, "milk-001");
  assert.equal(result.quantity, 0);
  assert.equal(result.unit, "each");
});

test("inventory query schema coerces and bounds pagination", () => {
  assert.deepEqual(inventoryQuerySchema.parse({ page: "2", limit: "50" }), {
    search: "",
    stockStatus: "all",
    page: 2,
    limit: 50,
  });
  assert.equal(inventoryQuerySchema.safeParse({ limit: "101" }).success, false);
});

test("stock movement rejects overship and computes valid stock changes", () => {
  assert.deepEqual(calculateStockMovement(10, "outbound", 4), {
    stockBefore: 10,
    stockAfter: 6,
    quantityDelta: -4,
  });
  assert.equal(calculateStockMovement(3, "outbound", 4), null);
  assert.equal(
    calculateStockMovement(8, "adjustment", 3, "decrease").stockAfter,
    5,
  );
  assert.equal(
    calculateStockMovement(8, "adjustment", 3, "increase").stockAfter,
    11,
  );
  assert.deepEqual(calculateStockMovement(3, "inbound", 4), {
    stockBefore: 3,
    stockAfter: 7,
    quantityDelta: 4,
  });
});

test("stock movement request requires a supported type and positive quantity", () => {
  assert.equal(
    stockMovementSchema.safeParse({ type: "outbound", quantity: 2 }).success,
    true,
  );
  assert.equal(
    stockMovementSchema.safeParse({
      type: "adjustment",
      direction: "increase",
      quantity: 2,
    }).success,
    true,
  );
  assert.equal(
    stockMovementSchema.safeParse({ type: "adjustment", quantity: 2 }).success,
    false,
  );
  assert.equal(
    stockMovementSchema.safeParse({ type: "transfer", quantity: 2 }).success,
    false,
  );
  assert.equal(
    stockMovementSchema.safeParse({ type: "inbound", quantity: 0 }).success,
    false,
  );
});
