import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const id = `diagnostics/test-${Date.now()}`;

try {
  const result = await new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { resource_type: "raw", type: "authenticated", public_id: id, overwrite: false },
        (err, res) => (err ? reject(err) : resolve(res))
      )
      .end(Buffer.from("%PDF-1.4 upload test"));
  });
  console.log("1. Upload worked:", result.public_id, `(${result.resource_type}, ${result.type})`);

  const url = cloudinary.utils.private_download_url(id, "", {
    resource_type: "raw",
    type: "authenticated",
    attachment: true,
    expires_at: Math.floor(Date.now() / 1000) + 300,
  });
  console.log("2. Signed link created:", `${url.slice(0, 70)}...`);

  await cloudinary.uploader.destroy(id, { resource_type: "raw", type: "authenticated", invalidate: true });
  console.log("3. Test file deleted. Cloudinary is fully working.");
} catch (err) {
  console.error("Failed:", { message: err?.message, http_code: err?.http_code, name: err?.name });
  process.exitCode = 1;
}