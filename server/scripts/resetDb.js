import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import mongoose from "mongoose";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const modelsDir = path.join(__dirname, "..", "models");

const run = async () => {
  if (!process.argv.includes("--yes")) {
    console.log("This deletes the ENTIRE database. Run again with --yes to confirm:");
    console.log("  npm run db:reset -- --yes");
    return;
  }

  const files = fs.readdirSync(modelsDir).filter((f) => f.endsWith(".js"));
  for (const file of files) await import(pathToFileURL(path.join(modelsDir, file)).href);
  console.log(`Loaded models: ${Object.keys(mongoose.models).join(", ")}`);

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Dropping database: ${mongoose.connection.name}`);
  await mongoose.connection.dropDatabase();

  for (const Model of Object.values(mongoose.models)) await Model.syncIndexes();

  console.log("Database reset. Indexes recreated.");
  console.log("Next: npm run seed:admin, then optionally npm run seed:jobs and npm run seed:apps");
};

run()
  .catch((err) => {
    console.error("Reset failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());