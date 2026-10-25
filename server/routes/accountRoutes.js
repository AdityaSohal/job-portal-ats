import { Router } from "express";
import { body } from "express-validator";
import { protect } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { authLimiter } from "../middlewares/rateLimiters.js";
import { changePassword } from "../controllers/accountController.js";

const router = Router();
router.use(protect);

router.patch(
  "/password",
  authLimiter,
  [
    body("currentPassword").isString().notEmpty().withMessage("Current password is required"),
    body("newPassword")
      .isString().withMessage("New password is required").bail()
      .isLength({ min: 8, max: 72 }).withMessage("Password must be 8-72 characters")
      .matches(/[A-Za-z]/).withMessage("Password must contain a letter")
      .matches(/\d/).withMessage("Password must contain a number"),
  ],
  validate,
  changePassword
);

export default router;