import { z } from "zod";

export const emailRule = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Enter your email")
  .email("Enter a valid email");

// Same rules as the server
export const passwordRule = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72, "Use at most 72 characters")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/\d/, "Include at least one number");

export const otpRule = z.string().regex(/^\d{6}$/, "Enter the 6-digit code");