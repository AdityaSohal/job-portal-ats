import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

try {
  await cloudinary.api.ping();
  console.log("Cloudinary credentials are valid.");
} catch (err) {
  console.error("Cloudinary check failed:", err?.error?.message || err?.message || err);
  process.exitCode = 1;
}