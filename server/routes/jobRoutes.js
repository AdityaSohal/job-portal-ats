import { Router } from "express";
import { body, param, query } from "express-validator";
import { protect, authorize, requireApprovedCompany } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { searchLimiter } from "../middlewares/rateLimiters.js";
import { ROLES, WORK_MODES, EMPLOYMENT_TYPES, APPLICATION_STAGES } from "../utils/constants.js";
import {
  createJob, listMyJobs, getMyJob, updateJob, closeJob, deleteJob,
} from "../controllers/jobController.js";
import { searchJobs, getPublicJob } from "../controllers/publicJobController.js";
import { listApplicants } from "../controllers/applicationController.js";

const router = Router();
const recruiterOnly = [protect, authorize(ROLES.RECRUITER)];
const idRule = param("id").isMongoId();

const jobRules = (required) => {
  const f = (name) => {
    const chain = body(name);
    return required
      ? chain.exists({ values: "falsy" }).withMessage(`${name} is required`).bail()
      : chain.optional();
  };
  return [
    f("title").isString().trim().isLength({ min: 3, max: 120 }),
    f("description").isString().trim().isLength({ min: 20, max: 8000 })
      .withMessage("Description must be 20-8000 characters"),
    f("location").isString().trim().isLength({ min: 2, max: 120 }),
    f("workMode").isIn(WORK_MODES),
    body("employmentType").optional().isIn(EMPLOYMENT_TYPES),
    body("skills").optional().isArray({ max: 20 }).withMessage("Skills must be an array of up to 20 items"),
    body("skills.*").isString().trim().isLength({ min: 1, max: 40 }),
    body("minExp").optional().isFloat({ min: 0, max: 60 }).toFloat(),
    body("maxExp").optional().isFloat({ min: 0, max: 60 }).toFloat(),
    body("ctcRange.min").optional().isFloat({ min: 0 }).toFloat(),
    body("ctcRange.max").optional().isFloat({ min: 0 }).toFloat(),
    body("openings").optional().isInt({ min: 1, max: 1000 }).toInt(),
    body("deadline").optional().isISO8601().withMessage("Deadline must be a valid date"),
  ];
};

const listOf = (allowed) => (value) => {
  const items = String(value).split(",").map((s) => s.trim()).filter(Boolean);
  if (!items.length || !items.every((i) => allowed.includes(i))) {
    throw new Error(`Must be a comma-separated list of: ${allowed.join(", ")}`);
  }
  return true;
};

const searchRules = [
  query("q").optional({ values: "falsy" }).isString().trim().isLength({ min: 2, max: 100 }),
  query("location").optional({ values: "falsy" }).isString().trim().isLength({ min: 1, max: 100 }),
  query("workMode").optional({ values: "falsy" }).isString().bail().custom(listOf(WORK_MODES)),
  query("employmentType").optional({ values: "falsy" }).isString().bail().custom(listOf(EMPLOYMENT_TYPES)),
  query("exp").optional({ values: "falsy" }).isFloat({ min: 0, max: 60 }),
  query("ctc").optional({ values: "falsy" }).isFloat({ min: 0, max: 1000 }),
  query("skills").optional({ values: "falsy" }).isString().isLength({ max: 300 }),
  query("sort").optional({ values: "falsy" }).isIn(["latest", "deadline"]),
  query("page").optional({ values: "falsy" }).isInt({ min: 1, max: 100 }),
  query("limit").optional({ values: "falsy" }).isInt({ min: 1, max: 50 }),
];

router.get(
  "/mine",
  recruiterOnly,
  [
    query("status").optional().isIn(["pending", "active", "closed", "rejected", "expired"]),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 50 }),
  ],
  validate,
  listMyJobs
);
router.get("/mine/:id", recruiterOnly, [idRule], validate, getMyJob);

router.get("/", searchLimiter, searchRules, validate, searchJobs);
router.get("/:id", searchLimiter, [idRule], validate, getPublicJob);

router.post("/", recruiterOnly, requireApprovedCompany, jobRules(true), validate, createJob);
router.patch("/:id", recruiterOnly, requireApprovedCompany, [idRule, ...jobRules(false)], validate, updateJob);
router.patch("/:id/close", recruiterOnly, [idRule], validate, closeJob);
router.delete("/:id", recruiterOnly, [idRule], validate, deleteJob);

router.get(
  "/:id/applicants",
  recruiterOnly,
  [
    idRule,
    query("stage").optional({ values: "falsy" }).isIn(APPLICATION_STAGES),
    query("sort").optional({ values: "falsy" }).isIn(["match", "latest"]),
    query("page").optional({ values: "falsy" }).isInt({ min: 1, max: 100 }),
    query("limit").optional({ values: "falsy" }).isInt({ min: 1, max: 50 }),
  ],
  validate,
  listApplicants
);

export default router;