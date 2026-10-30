import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  createInventoryItem,
  createLocation,
  createStockMovement,
  createWarehouse,
  deleteInventoryItem,
  getInventoryItem,
  listInventory,
  listTransactions,
  listWarehouseLocations,
  listWarehouses,
  updateInventoryItem,
  transferInventory,
} from "./inventoryController.js";

const router = Router();
router.use(requireAuth);

router.get("/warehouses", listWarehouses);
router.post("/warehouses", createWarehouse);
router.get("/warehouses/:warehouseId/locations", listWarehouseLocations);
router.post("/locations", createLocation);
router.get("/transactions", listTransactions);
router.get("/", listInventory);
router.post("/", createInventoryItem);
router.get("/:itemId", getInventoryItem);
router.patch("/:itemId", updateInventoryItem);
router.delete("/:itemId", deleteInventoryItem);
router.post("/:itemId/transactions", createStockMovement);
router.post("/:itemId/transfers", transferInventory);

export default router;
