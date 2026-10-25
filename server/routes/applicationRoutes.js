import { Router } from "express";
import { body, param, query } from "express-validator";
import { protect, authorize } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { applyLimiter } from "../middlewares/rateLimiters.js";
import { ROLES, APPLICATION_STAGES } from "../utils/constants.js";
import { RECRUITER_TARGETS } from "../utils/applicationStateMachine.js";
import {
  applyToJob, listMyApplications, getMyApplication, withdrawApplication,
  getApplication, changeStage, addNote, downloadApplicantResume,
} from "../controllers/applicationController.js";

const router = Router();
router.use(protect);

const candidateOnly = authorize(ROLES.CANDIDATE);
const recruiterOnly = authorize(ROLES.RECRUITER);
const idRule = param("id").isMongoId();

router.post(
  "/",
  candidateOnly,
  applyLimiter,
  [
    body("jobId").isMongoId().withMessage("A valid jobId is required"),
    body("resumeId").isMongoId().withMessage("A valid resumeId is required"),
    body("coverNote").optional({ values: "falsy" }).isString().bail().trim().isLength({ max: 2000 }),
  ],
  validate,
  applyToJob
);

router.get(
  "/me",
  candidateOnly,
  [
    query("stage").optional({ values: "falsy" }).isIn(APPLICATION_STAGES),
    query("page").optional({ values: "falsy" }).isInt({ min: 1, max: 100 }),
    query("limit").optional({ values: "falsy" }).isInt({ min: 1, max: 50 }),
  ],
  validate,
  listMyApplications
);
router.get("/me/:id", candidateOnly, [idRule], validate, getMyApplication);
router.patch("/:id/withdraw", candidateOnly, [idRule], validate, withdrawApplication);

router.get("/:id", recruiterOnly, [idRule], validate, getApplication);

router.patch(
  "/:id/stage",
  recruiterOnly,
  [
    idRule,
    body("stage").isIn(RECRUITER_TARGETS).withMessage(`Stage must be one of: ${RECRUITER_TARGETS.join(", ")}`),
    body("note").optional({ values: "falsy" }).isString().bail().trim().isLength({ max: 500 }),
  ],
  validate,
  changeStage
);

router.post(
  "/:id/notes",
  recruiterOnly,
  [idRule, body("text").isString().bail().trim().isLength({ min: 1, max: 1000 })],
  validate,
  addNote
);

router.get("/:id/resume", recruiterOnly, [idRule], validate, downloadApplicantResume);

export default router;