const REQUIRED = ["MONGO_URI", "JWT_SECRET", "OTP_SECRET"];
const RECOMMENDED = [
  "CLIENT_URL", "EMAIL_HOST", "EMAIL_USER", "EMAIL_PASS", "GOOGLE_CLIENT_ID",
  "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET", "CRON_SECRET",
];

export const validateEnv = () => {
  const problems = [];
  for (const key of REQUIRED) if (!process.env[key]) problems.push(`${key} is not set`);
  for (const key of ["JWT_SECRET", "OTP_SECRET"]) {
    if (process.env[key] && process.env[key].length < 32) problems.push(`${key} must be at least 32 characters`);
  }
  if (process.env.JWT_SECRET && process.env.JWT_SECRET === process.env.OTP_SECRET) {
    problems.push("OTP_SECRET must be different from JWT_SECRET");
  }
  if (problems.length) throw new Error(`Invalid environment configuration:\n - ${problems.join("\n - ")}`);

  const missing = RECOMMENDED.filter((key) => !process.env[key]);
  if (missing.length && process.env.NODE_ENV !== "test") {
    console.warn(`Optional settings not set (related features will fail): ${missing.join(", ")}`);
  }
};