import { Router } from "express";
import { body, param, query } from "express-validator";
import { protect, authorize } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { interviewRules } from "../middlewares/interviewRules.js";
import { ROLES, INTERVIEW_STATUS } from "../utils/constants.js";
import {
  listInterviews, updateInterview, cancelInterview, completeInterview, confirmInterview, requestReschedule,
} from "../controllers/interviewController.js";

const router = Router();
router.use(protect);

const recruiterOnly = authorize(ROLES.RECRUITER);
const candidateOnly = authorize(ROLES.CANDIDATE);
const idRule = param("id").isMongoId();

router.get(
  "/",
  authorize(ROLES.RECRUITER, ROLES.CANDIDATE),
  [
    query("status").optional({ values: "falsy" }).isIn(INTERVIEW_STATUS),
    query("upcoming").optional({ values: "falsy" }).isIn(["true", "false"]),
    query("page").optional({ values: "falsy" }).isInt({ min: 1, max: 100 }),
    query("limit").optional({ values: "falsy" }).isInt({ min: 1, max: 50 }),
  ],
  validate,
  listInterviews
);

router.patch("/:id", recruiterOnly, [idRule, ...interviewRules(false)], validate, updateInterview);
router.patch("/:id/cancel", recruiterOnly, [idRule], validate, cancelInterview);
router.patch("/:id/complete", recruiterOnly, [idRule], validate, completeInterview);


router.patch("/:id/confirm", candidateOnly, [idRule], validate, confirmInterview);
router.patch(
  "/:id/request-reschedule",
  candidateOnly,
  [idRule, body("reason").isString().bail().trim().isLength({ min: 5, max: 500 })
    .withMessage("Please give a reason of 5-500 characters")],
  validate,
  requestReschedule
);

export default router;