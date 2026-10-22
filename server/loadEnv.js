import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const result = dotenv.config({ path: path.join(__dirname, ".env") });

if (result.error) {
  console.warn("No .env file loaded (fine on Vercel):", result.error.message);
}