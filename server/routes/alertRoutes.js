import { Router } from "express";
import { body, param } from "express-validator";
import { protect, authorize } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { ROLES, WORK_MODES, EMPLOYMENT_TYPES } from "../utils/constants.js";
import { createAlert, listAlerts, updateAlert, deleteAlert } from "../controllers/alertController.js";

const router = Router();
router.use(protect, authorize(ROLES.CANDIDATE));

const idRule = param("id").isMongoId();
const nameRule = body("name").optional({ values: "falsy" }).isString().bail().trim().isLength({ min: 1, max: 80 });
const frequencyRule = body("frequency").optional().isIn(["daily", "weekly"]);

router.get("/", listAlerts);

router.post(
  "/",
  [
    nameRule,
    frequencyRule,
    body("filters").isObject().withMessage("filters must be an object"),
    body("filters.q").optional({ values: "falsy" }).isString().bail().trim().isLength({ min: 2, max: 100 }),
    body("filters.location").optional({ values: "falsy" }).isString().bail().trim().isLength({ min: 1, max: 100 }),
    body("filters.workMode").optional().isArray({ max: 3 }),
    body("filters.workMode.*").isIn(WORK_MODES),
    body("filters.employmentType").optional().isArray({ max: 4 }),
    body("filters.employmentType.*").isIn(EMPLOYMENT_TYPES),
    body("filters.exp").optional({ values: "null" }).isFloat({ min: 0, max: 60 }),
    body("filters.ctc").optional({ values: "null" }).isFloat({ min: 0, max: 1000 }),
    body("filters.skills").optional().isArray({ max: 10 }),
    body("filters.skills.*").isString().bail().trim().isLength({ min: 1, max: 40 }),
  ],
  validate,
  createAlert
);

router.patch(
  "/:id",
  [idRule, nameRule, frequencyRule, body("isActive").optional().isBoolean().toBoolean()],
  validate,
  updateAlert
);
router.delete("/:id", [idRule], validate, deleteAlert);

export default router;