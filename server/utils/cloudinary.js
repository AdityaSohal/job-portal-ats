import { v2 as cloudinary } from "cloudinary";
import ApiError from "./ApiError.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const assertConfigured = () => {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error("Cloudinary environment variables are not set");
  }
};

export const uploadPrivate = (buffer, publicId) => {
  assertConfigured();
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { resource_type: "raw", type: "authenticated", public_id: publicId, overwrite: false },
        (err, result) => (err ? reject(err) : resolve(result))
      )
      .end(buffer);
  }).catch((err) => {
    console.error("Cloudinary upload failed:", err.message);
    throw new ApiError(502, "File storage failed. Please try again.");
  });
};

export const deletePrivate = async (publicId) => {
  assertConfigured();
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: "raw",
      type: "authenticated",
      invalidate: true,
    });
  } catch (err) {
    console.error("Cloudinary delete failed:", err.message); 
  }
};

export const SIGNED_URL_TTL_SECONDS = 300;

export const signedDownloadUrl = (publicId) => {
  assertConfigured();
  return cloudinary.utils.private_download_url(publicId, "", {
    resource_type: "raw",
    type: "authenticated",
    attachment: true,
    expires_at: Math.floor(Date.now() / 1000) + SIGNED_URL_TTL_SECONDS,
  });
};