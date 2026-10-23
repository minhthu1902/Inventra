import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  getDashboardSummary,
  getInventoryTrend,
  getWarehouseUtilization,
} from "./dashboardController.js";

const router = Router();
router.use(requireAuth);

router.get("/summary", getDashboardSummary);
router.get("/trend", getInventoryTrend);
router.get("/warehouse-utilization", getWarehouseUtilization);

export default router;
