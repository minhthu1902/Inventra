export type FieldErrors = Partial<Record<string, string>>;

const CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const BARCODE_PATTERN = /^[A-Za-z0-9-]*$/;

function text(errors: FieldErrors, field: string, value: string, label: string, { required = false, max }: { required?: boolean; max: number }) {
  const trimmed = value.trim();
  if (required && !trimmed) errors[field] = `${label} is required.`;
  else if (trimmed.length > max) errors[field] = `${label} must be ${max} characters or fewer.`;
}

function nonNegative(errors: FieldErrors, field: string, value: number, label: string, { decimals }: { decimals?: number } = {}) {
  if (!Number.isFinite(value)) errors[field] = `${label} must be a number.`;
  else if (value < 0) errors[field] = `${label} cannot be negative.`;
  else if (decimals !== undefined && Math.abs(Math.round(value * 10 ** decimals) - value * 10 ** decimals) > 1e-6) {
    errors[field] = `${label} can have at most ${decimals} decimal places.`;
  }
}

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function expiry(errors: FieldErrors, isPerishable: boolean, expiryDate: string, { allowPast = false } = {}) {
  if (isPerishable && !expiryDate) errors.expiryDate = "Perishable items need an expiry date.";
  else if (expiryDate && Number.isNaN(new Date(expiryDate).getTime())) errors.expiryDate = "Enter a valid date.";
  else if (expiryDate && !allowPast && expiryDate < todayKey()) errors.expiryDate = "Expiry date cannot be in the past.";
}

export function validateItemDraft(draft: {
  sku: string; barcode: string; name: string; category: string; unit: string;
  quantity: number; reorderPoint: number; unitCost: number;
  isPerishable: boolean; expiryDate: string; batchNumber: string;
  warehouseId: string; locationId: string;
}) {
  const errors: FieldErrors = {};
  text(errors, "sku", draft.sku, "SKU", { required: true, max: 64 });
  if (!errors.sku && !CODE_PATTERN.test(draft.sku.trim())) {
    errors.sku = "Use letters, numbers, dots, dashes or underscores (no spaces).";
  }
  text(errors, "barcode", draft.barcode, "Barcode", { max: 80 });
  if (!errors.barcode && !BARCODE_PATTERN.test(draft.barcode.trim())) {
    errors.barcode = "Barcode can only contain letters, numbers and dashes.";
  }
  text(errors, "name", draft.name, "Product name", { required: true, max: 160 });
  text(errors, "category", draft.category, "Category", { max: 80 });
  text(errors, "unit", draft.unit, "Unit", { required: true, max: 24 });
  nonNegative(errors, "quantity", draft.quantity, "Opening quantity");
  nonNegative(errors, "reorderPoint", draft.reorderPoint, "Reorder point");
  nonNegative(errors, "unitCost", draft.unitCost, "Unit cost", { decimals: 2 });
  expiry(errors, draft.isPerishable, draft.expiryDate);
  text(errors, "batchNumber", draft.batchNumber, "Batch number", { max: 80 });
  if (!draft.warehouseId) errors.warehouseId = "Choose a warehouse.";
  if (!draft.locationId) errors.locationId = "Choose a location.";
  return errors;
}

export function validateItemUpdate(update: {
  name: string; barcode: string; category: string; unit: string; reorderPoint: number; unitCost: number;
  isPerishable: boolean; expiryDate: string; batchNumber: string;
}) {
  const errors: FieldErrors = {};
  text(errors, "name", update.name, "Product name", { required: true, max: 160 });
  text(errors, "barcode", update.barcode, "Barcode", { max: 80 });
  if (!errors.barcode && !BARCODE_PATTERN.test(update.barcode.trim())) {
    errors.barcode = "Barcode can only contain letters, numbers and dashes.";
  }
  text(errors, "category", update.category, "Category", { max: 80 });
  text(errors, "unit", update.unit, "Unit", { required: true, max: 24 });
  nonNegative(errors, "reorderPoint", update.reorderPoint, "Reorder point");
  nonNegative(errors, "unitCost", update.unitCost, "Unit cost", { decimals: 2 });
  // Existing items may already be past expiry; only require a valid date when editing
  expiry(errors, update.isPerishable, update.expiryDate, { allowPast: true });
  text(errors, "batchNumber", update.batchNumber, "Batch number", { max: 80 });
  return errors;
}

export function validateMovement(movement: {
  type: "inbound" | "outbound" | "adjustment" | "transfer";
  direction?: "increase" | "decrease";
  quantity: number;
  currentStock: number;
  reference: string;
  note: string;
  destinationWarehouseId?: string;
  destinationLocationId?: string;
}) {
  const errors: FieldErrors = {};
  const reducesStock = movement.type === "outbound" || movement.type === "transfer" || (movement.type === "adjustment" && movement.direction === "decrease");
  if (!Number.isFinite(movement.quantity) || movement.quantity <= 0) {
    errors.quantity = "Quantity must be greater than zero.";
  } else if (reducesStock && movement.quantity > movement.currentStock) {
    errors.quantity = `Only ${movement.currentStock} available to remove.`;
  }
  if (movement.type === "transfer") {
    if (!movement.destinationWarehouseId) errors.destinationWarehouseId = "Choose a destination warehouse.";
    if (!movement.destinationLocationId) errors.destinationLocationId = "Choose a destination location.";
  }
  text(errors, "reference", movement.reference, "Reference", { max: 80 });
  text(errors, "note", movement.note, "Note", { max: 500 });
  return errors;
}

export function validateWarehouse(warehouse: { name: string; code: string; address: string; capacityUnits: number }) {
  const errors: FieldErrors = {};
  text(errors, "name", warehouse.name, "Warehouse name", { required: true, max: 120 });
  text(errors, "code", warehouse.code, "Code", { required: true, max: 32 });
  if (!errors.code && !CODE_PATTERN.test(warehouse.code.trim())) {
    errors.code = "Use letters, numbers, dots, dashes or underscores (no spaces).";
  }
  text(errors, "address", warehouse.address, "Address", { max: 240 });
  nonNegative(errors, "capacityUnits", warehouse.capacityUnits, "Capacity");
  return errors;
}

export function validateLocation(location: { warehouseId: string; code: string; zone: string; capacityUnits: number }) {
  const errors: FieldErrors = {};
  if (!location.warehouseId) errors.warehouseId = "Choose a warehouse.";
  text(errors, "code", location.code, "Location code", { required: true, max: 40 });
  if (!errors.code && !CODE_PATTERN.test(location.code.trim())) {
    errors.code = "Use letters, numbers, dots, dashes or underscores (no spaces).";
  }
  text(errors, "zone", location.zone, "Zone", { max: 80 });
  nonNegative(errors, "capacityUnits", location.capacityUnits, "Capacity");
  return errors;
}

export function hasErrors(errors: FieldErrors) {
  return Object.values(errors).some(Boolean);
}
