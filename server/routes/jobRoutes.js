import { Router } from "express";
import { body, param, query } from "express-validator";
import { protect, authorize, requireApprovedCompany } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { ROLES, WORK_MODES, EMPLOYMENT_TYPES } from "../utils/constants.js";
import {
  createJob, listMyJobs, getMyJob, updateJob, closeJob, deleteJob,
} from "../controllers/jobController.js";

const router = Router();
const recruiterOnly = [protect, authorize(ROLES.RECRUITER)];
const jobRules = (required) => {
  const f = (name) => {
    const chain = body(name);
    return required ? chain.exists({ values: "falsy" }).withMessage(`${name} is required`).bail() : chain.optional();
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

const idRule = param("id").isMongoId();

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

router.post("/", recruiterOnly, requireApprovedCompany, jobRules(true), validate, createJob);
router.patch("/:id", recruiterOnly, requireApprovedCompany, [idRule, ...jobRules(false)], validate, updateJob);
router.patch("/:id/close", recruiterOnly, [idRule], validate, closeJob);
router.delete("/:id", recruiterOnly, [idRule], validate, deleteJob);

export default router;