import { Router } from "express";
import { body, param } from "express-validator";
import { protect, authorize } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { uploadResumeFile } from "../middlewares/upload.js";
import { uploadLimiter } from "../middlewares/rateLimiters.js";
import { ROLES, WORK_MODES } from "../utils/constants.js";
import {
  getMyProfile, updateMyProfile, uploadResume, renameResume, deleteResume, downloadResume,
} from "../controllers/profileController.js";

const router = Router();

router.use(protect, authorize(ROLES.CANDIDATE));

const optionalUrl = (field) =>
  body(field).optional({ values: "falsy" })
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .withMessage("Must be a full http(s) URL");

const profileRules = [
  body("name").optional().isString().trim().isLength({ min: 2, max: 80 }),
  body("headline").optional().isString().trim().isLength({ max: 120 }),
  body("summary").optional().isString().trim().isLength({ max: 2000 }),
  body("location").optional().isString().trim().isLength({ max: 100 }),
  body("phone").optional({ values: "falsy" }).matches(/^\+?[\d\s\-()]{7,20}$/).withMessage("Invalid phone number"),
  body("skills").optional().isArray({ max: 30 }).withMessage("Skills must be an array of up to 30 items"),
  body("skills.*").isString().trim().isLength({ min: 1, max: 40 }),
  body("experienceYears").optional().isFloat({ min: 0, max: 60 }).toFloat(),
  body("expectedCtc").optional({ values: "null" }).isFloat({ min: 0, max: 1000 }).toFloat(),
  body("preferredWorkMode").optional({ values: "falsy" }).isIn(WORK_MODES),

  body("education").optional().isArray({ max: 10 }),
  body("education.*.institution").isString().trim().isLength({ min: 2, max: 120 }),
  body("education.*.degree").optional().isString().trim().isLength({ max: 80 }),
  body("education.*.fieldOfStudy").optional().isString().trim().isLength({ max: 80 }),
  body("education.*.startYear").optional({ values: "falsy" }).isInt({ min: 1950, max: 2100 }).toInt(),
  body("education.*.endYear").optional({ values: "falsy" }).isInt({ min: 1950, max: 2100 }).toInt(),
  body("education.*.grade").optional().isString().trim().isLength({ max: 20 }),

  body("experience").optional().isArray({ max: 15 }),
  body("experience.*.company").isString().trim().isLength({ min: 2, max: 120 }),
  body("experience.*.title").isString().trim().isLength({ min: 2, max: 120 }),
  body("experience.*.startDate").optional({ values: "falsy" }).isISO8601(),
  body("experience.*.endDate").optional({ values: "falsy" }).isISO8601(),
  body("experience.*.description").optional().isString().trim().isLength({ max: 1500 }),

  optionalUrl("links.portfolio"),
  optionalUrl("links.github"),
  optionalUrl("links.linkedin"),
];

const resumeId = param("resumeId").isMongoId();

router.get("/me", getMyProfile);
router.put("/me", profileRules, validate, updateMyProfile);
router.post("/resumes", uploadLimiter, uploadResumeFile, uploadResume);
router.patch(
  "/resumes/:resumeId",
  [resumeId, body("name").isString().bail().trim().isLength({ min: 1, max: 80 })],
  validate,
  renameResume
);
router.delete("/resumes/:resumeId", [resumeId], validate, deleteResume);
router.get("/resumes/:resumeId/download", [resumeId], validate, downloadResume);

export default router;