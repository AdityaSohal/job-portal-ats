import jwt from "jsonwebtoken";

const COOKIE_NAME = "token";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
});

export const setAuthCookie = (res, user) => {
  const token = jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
  res.cookie(COOKIE_NAME, token, { ...cookieOptions(), maxAge: SEVEN_DAYS_MS });
};

export const clearAuthCookie = (res) => res.clearCookie(COOKIE_NAME, cookieOptions());