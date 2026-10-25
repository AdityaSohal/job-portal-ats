import { Router } from "express";
import { body, param, query } from "express-validator";
import { protect, authorize } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { ROLES, JOB_STATUS } from "../utils/constants.js";
import { listJobs, approveJob, rejectJob } from "../controllers/adminJobController.js";

const router = Router();

router.use(protect, authorize(ROLES.ADMIN));

router.get(
  "/",
  [
    query("status").optional().isIn([...JOB_STATUS, "all"]),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 50 }),
  ],
  validate,
  listJobs
);
router.patch("/:id/approve", [param("id").isMongoId()], validate, approveJob);
router.patch(
  "/:id/reject",
  [
    param("id").isMongoId(),
    body("reason").isString().bail().trim().isLength({ min: 5, max: 500 })
      .withMessage("A reason of 5-500 characters is required"),
  ],
  validate,
  rejectJob
);

export default router;