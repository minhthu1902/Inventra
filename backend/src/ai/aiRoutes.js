import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { requireAuth } from "../middleware/requireAuth.js";
import { askInventoryInvestigator } from "./investigatorController.js";
import { createInvestigatorDemoData } from "./demoDataController.js";

const router = Router();
const investigatorLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many investigator requests. Try again later." },
});

router.use(requireAuth);
router.post("/investigator", investigatorLimit, askInventoryInvestigator);
router.post("/demo-data", investigatorLimit, createInvestigatorDemoData);

export default router;
