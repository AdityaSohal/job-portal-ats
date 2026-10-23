import { Router } from "express";
import { body, param, query } from "express-validator";
import { protect, authorize } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { ROLES } from "../utils/constants.js";
import { listCompanies, approveCompany, rejectCompany } from "../controllers/adminController.js";

const router = Router();

router.use(protect, authorize(ROLES.ADMIN)); 

router.get(
  "/companies",
  [
    query("status").optional().isIn(["pending", "approved", "rejected", "all"]),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 50 }),
  ],
  validate,
  listCompanies
);

router.patch("/companies/:id/approve", [param("id").isMongoId()], validate, approveCompany);

router.patch(
  "/companies/:id/reject",
  [
    param("id").isMongoId(),
    body("reason").isString().bail().trim().isLength({ min: 5, max: 500 })
      .withMessage("A reason of 5-500 characters is required"),
  ],
  validate,
  rejectCompany
);

export default router;