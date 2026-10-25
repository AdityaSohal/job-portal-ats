import { Router } from "express";
import { body } from "express-validator";
import { validate } from "../middlewares/validate.js";
import { authLimiter, otpLimiter, loginAccountLimiter } from "../middlewares/rateLimiters.js";
import { protect } from "../middlewares/auth.js";
import {
  register, login, googleLogin, logout, getMe, forgotPassword, resetPassword,
  verifyEmail, resendVerification,
} from "../controllers/authController.js";

const router = Router();

const emailRule = body("email")
  .isString().bail().trim().toLowerCase()
  .isEmail().withMessage("A valid email is required");

const otpRule = body("otp").isString().matches(/^\d{6}$/).withMessage("Code must be 6 digits");

const passwordRule = (field = "password") =>
  body(field)
    .isString().withMessage("Password is required").bail()
    .isLength({ min: 8, max: 72 }).withMessage("Password must be 8-72 characters")
    .matches(/[A-Za-z]/).withMessage("Password must contain a letter")
    .matches(/\d/).withMessage("Password must contain a number");

const isRecruiter = body("role").equals("recruiter");

const registerRules = [
  body("name").isString().bail().trim().isLength({ min: 2, max: 80 })
    .withMessage("Name must be 2-80 characters"),
  emailRule,
  passwordRule(),
  body("role").optional().isIn(["candidate", "recruiter"])
    .withMessage("Role must be candidate or recruiter"),
  body("company.name").if(isRecruiter).isString().bail().trim().isLength({ min: 2, max: 120 })
    .withMessage("Company name is required for recruiters"),
  body("company.website").optional({ values: "falsy" })
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .withMessage("Company website must be a full http(s) URL"),
  body("company.industry").optional().isString().trim().isLength({ max: 80 }),
  body("company.location").optional().isString().trim().isLength({ max: 120 }),
  body("company.description").optional().isString().trim().isLength({ max: 2000 }),
];

router.post("/register", authLimiter, registerRules, validate, register);
router.post("/verify-email", otpLimiter, [emailRule, otpRule], validate, verifyEmail);
router.post("/resend-verification", otpLimiter, [emailRule], validate, resendVerification);
router.post(
  "/login",
  authLimiter,
  loginAccountLimiter,
  [emailRule, body("password").isString().notEmpty()],
  validate,
  login
);
router.post("/google", authLimiter, [body("credential").isString().notEmpty()], validate, googleLogin);
router.post("/forgot-password", otpLimiter, [emailRule], validate, forgotPassword);
router.post(
  "/reset-password",
  otpLimiter,
  [emailRule, otpRule, passwordRule("newPassword")],
  validate,
  resetPassword
);
router.post("/logout", logout);
router.get("/me", protect, getMe);

export default router;