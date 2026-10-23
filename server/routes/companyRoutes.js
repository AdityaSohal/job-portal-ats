import { Router } from "express";
import { body } from "express-validator";
import { protect, authorize } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { ROLES } from "../utils/constants.js";
import { getMyCompany, updateMyCompany } from "../controllers/companyController.js";

const router = Router();

router.use(protect, authorize(ROLES.RECRUITER));

router.get("/me", getMyCompany);

router.patch(
  "/me",
  [
    body("name").optional().isString().trim().isLength({ min: 2, max: 120 }),
    body("website").optional({ values: "falsy" }).isURL(),
    body("industry").optional().isString().trim().isLength({ max: 80 }),
    body("size").optional().isIn(["1-10", "11-50", "51-200", "201-1000", "1000+"]),
    body("location").optional().isString().trim().isLength({ max: 120 }),
    body("description").optional().isString().trim().isLength({ max: 2000 }),
  ],
  validate,
  updateMyCompany
);

export default router;