import { Router } from "express";
import { body, param, query } from "express-validator";
import { protect, authorize } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { ROLES } from "../utils/constants.js";
import { saveJob, unsaveJob, getSavedIds, listSaved } from "../controllers/savedJobController.js";

const router = Router();
router.use(protect, authorize(ROLES.CANDIDATE));

router.get(
  "/",
  [
    query("page").optional({ values: "falsy" }).isInt({ min: 1, max: 100 }),
    query("limit").optional({ values: "falsy" }).isInt({ min: 1, max: 50 }),
  ],
  validate,
  listSaved
);
router.get("/ids", getSavedIds); 
router.post("/", [body("jobId").isMongoId().withMessage("A valid jobId is required")], validate, saveJob);
router.delete("/:jobId", [param("jobId").isMongoId()], validate, unsaveJob);

export default router;