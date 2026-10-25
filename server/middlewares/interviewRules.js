import { body } from "express-validator";
import { INTERVIEW_MODES } from "../utils/constants.js";

// required=true when scheduling, optional when editing
export const interviewRules = (required) => {
  const field = (name) =>
    required ? body(name).exists().withMessage(`${name} is required`).bail() : body(name).optional();

  return [
    field("scheduledAt")
      .isISO8601({ strict: true })
      .withMessage("scheduledAt must be a date and time like 2026-12-15T10:00:00+05:30"),
    field("mode").isIn(INTERVIEW_MODES),
    body("durationMinutes").optional().isInt({ min: 15, max: 480 }).toInt(),
    body("meetingLink").optional({ values: "falsy" })
      .isURL({ protocols: ["https"], require_protocol: true })
      .isLength({ max: 500 })
      .withMessage("The meeting link must be an https URL"),
    body("location").optional({ values: "falsy" }).isString().bail().trim().isLength({ max: 200 }),
    body("interviewerName").optional({ values: "falsy" }).isString().bail().trim().isLength({ max: 80 }),
    body("instructions").optional({ values: "falsy" }).isString().bail().trim().isLength({ max: 1000 }),
  ];
};