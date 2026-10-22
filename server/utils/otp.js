import crypto from "crypto";

export const generateOtp = () =>
  String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");

export const hashOtp = (email, otp) =>
  crypto.createHmac("sha256", process.env.JWT_SECRET).update(`${email}:${otp}`).digest("hex");

export const safeEqual = (a, b) => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};