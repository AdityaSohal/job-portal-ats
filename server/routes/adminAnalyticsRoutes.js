import { Router } from "express";
import { query } from "express-validator";
import { protect, authorize } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { ROLES } from "../utils/constants.js";
import { platformOverview } from "../controllers/adminAnalyticsController.js";

const router = Router();
router.use(protect, authorize(ROLES.ADMIN));

router.get(
  "/overview",
  [query("days").optional({ values: "falsy" }).isInt({ min: 1, max: 90 })],
  validate,
  platformOverview
);

export default router;