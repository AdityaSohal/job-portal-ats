import { Router } from "express";
import { query } from "express-validator";
import { protect, authorize } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { ROLES } from "../utils/constants.js";
import { listAuditLogs } from "../controllers/adminAnalyticsController.js";

const router = Router();
router.use(protect, authorize(ROLES.ADMIN));

router.get(
  "/",
  [
    query("action").optional({ values: "falsy" }).matches(/^[A-Z_]{3,40}$/).withMessage("Invalid action"),
    query("actorId").optional({ values: "falsy" }).isMongoId(),
    query("targetType").optional({ values: "falsy" }).isIn(["Company", "Job", "User", "Application"]),
    query("page").optional({ values: "falsy" }).isInt({ min: 1, max: 1000 }),
    query("limit").optional({ values: "falsy" }).isInt({ min: 1, max: 100 }),
  ],
  validate,
  listAuditLogs
);

export default router;