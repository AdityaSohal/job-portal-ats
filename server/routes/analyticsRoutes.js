import { Router } from "express";
import { param, query } from "express-validator";
import { protect, authorize } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { ROLES } from "../utils/constants.js";
import { recruiterOverview, jobFunnel } from "../controllers/analyticsController.js";

const router = Router();
router.use(protect, authorize(ROLES.RECRUITER));

const daysRule = query("days").optional({ values: "falsy" }).isInt({ min: 1, max: 90 });

router.get("/recruiter/overview", [daysRule], validate, recruiterOverview);
router.get("/recruiter/jobs/:id/funnel", [param("id").isMongoId(), daysRule], validate, jobFunnel);

export default router;