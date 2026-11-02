import { z } from "zod";

// Stock is counted in whole units (each, carton, bag...), with upper bounds so a
// typo or a crafted request cannot push totals into meaningless values
export const MAX_MOVEMENT_QUANTITY = 1_000_000;
export const MAX_ITEM_STOCK = 10_000_000;
export const MAX_CAPACITY_UNITS = 100_000_000;
export const MAX_UNIT_COST = 1_000_000;

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Must be a valid id");
const positiveQuantitySchema = z
  .number()
  .int("Quantity must be a whole number")
  .positive()
  .max(MAX_MOVEMENT_QUANTITY);
const unitCountSchema = (max) => z.number().int("Must be a whole number").min(0).max(max);
const unitCostSchema = z.number().finite().min(0).max(MAX_UNIT_COST);

export const createWarehouseSchema = z.object({
  name: z.string().trim().min(1).max(120),
  code: z.string().trim().min(1).max(32),
  address: z.string().trim().max(240).optional().default(""),
  capacityUnits: unitCountSchema(MAX_CAPACITY_UNITS).optional().default(0),
});

export const createLocationSchema = z.object({
  warehouseId: objectIdSchema,
  code: z.string().trim().min(1).max(40),
  zone: z.string().trim().max(80).optional().default(""),
  capacityUnits: unitCountSchema(MAX_CAPACITY_UNITS).optional().default(0),
});

export const createInventoryItemSchema = z.object({
  warehouseId: objectIdSchema,
  locationId: objectIdSchema,
  sku: z.string().trim().min(1).max(64),
  barcode: z.string().trim().max(80).optional().default(""),
  name: z.string().trim().min(1).max(160),
  category: z.string().trim().max(80).optional().default("General"),
  unit: z.string().trim().max(24).optional().default("each"),
  quantity: unitCountSchema(MAX_MOVEMENT_QUANTITY).optional().default(0),
  reorderPoint: unitCountSchema(MAX_MOVEMENT_QUANTITY).optional().default(0),
  unitCost: unitCostSchema.optional().default(0),
  isPerishable: z.boolean().optional().default(false),
  expiryDate: z.iso.datetime().optional().nullable().default(null),
  batchNumber: z.string().trim().max(80).optional().default(""),
});

export const updateInventoryItemSchema = createInventoryItemSchema
  .omit({
    warehouseId: true,
    locationId: true,
    sku: true,
    quantity: true,
  })
  .partial();

export const stockMovementSchema = z
  .object({
    type: z.enum(["inbound", "outbound", "adjustment"]),
    direction: z.enum(["increase", "decrease"]).optional(),
    quantity: positiveQuantitySchema,
    reference: z.string().trim().max(80).optional().default(""),
    note: z.string().trim().max(500).optional().default(""),
    clientOperationId: z.uuid().optional(),
  })
  .superRefine((movement, context) => {
    if (movement.type === "adjustment" && !movement.direction) {
      context.addIssue({
        code: "custom",
        path: ["direction"],
        message: "Adjustment direction is required",
      });
    }
    if (movement.type !== "adjustment" && movement.direction) {
      context.addIssue({
        code: "custom",
        path: ["direction"],
        message: "Direction only applies to adjustments",
      });
    }
  });

export const inventoryTransferSchema = z.object({
  destinationWarehouseId: objectIdSchema,
  destinationLocationId: objectIdSchema,
  quantity: positiveQuantitySchema,
  reference: z.string().trim().max(80).optional().default(""),
  note: z.string().trim().max(500).optional().default(""),
  clientOperationId: z.uuid().optional(),
});

export const inventoryQuerySchema = z.object({
  search: z.string().trim().max(120).optional().default(""),
  category: z.string().trim().max(80).optional(),
  warehouseId: objectIdSchema.optional(),
  stockStatus: z.enum(["all", "low", "out"]).optional().default("all"),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
});

export const transactionQuerySchema = z.object({
  type: z.enum(["inbound", "outbound", "adjustment", "transfer"]).optional(),
  inventoryItemId: objectIdSchema.optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
});

export function calculateStockMovement(
  currentStock,
  type,
  quantity,
  direction,
) {
  if (!Number.isFinite(currentStock) || currentStock < 0) {
    throw new TypeError("Current stock must be a non-negative number");
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new TypeError("Movement quantity must be greater than zero");
  }
  if (!new Set(["inbound", "outbound", "adjustment"]).has(type)) {
    throw new TypeError("Unsupported stock movement type");
  }
  if (
    type === "adjustment" &&
    direction !== "increase" &&
    direction !== "decrease"
  ) {
    throw new TypeError("Adjustment direction must be increase or decrease");
  }
  const isIncrease =
    type === "inbound" || (type === "adjustment" && direction === "increase");
  if (!isIncrease && quantity > currentStock) {
    return null;
  }

  const stockAfter = isIncrease
    ? currentStock + quantity
    : currentStock - quantity;
  return {
    stockBefore: currentStock,
    stockAfter,
    quantityDelta: isIncrease ? quantity : -quantity,
  };
}
