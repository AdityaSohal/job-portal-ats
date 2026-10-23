import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { ROLES } from "../utils/constants.js";

const { MONGO_URI, ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

const run = async () => {
  if (!MONGO_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("MONGO_URI, ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env");
  }

  await mongoose.connect(MONGO_URI);
  const email = ADMIN_EMAIL.toLowerCase().trim();
  const existing = await User.findOne({ email });

  if (existing && existing.role !== ROLES.ADMIN) {
    throw new Error(`${email} already exists as a ${existing.role}. Use a different ADMIN_EMAIL.`);
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  if (existing) {
    existing.passwordHash = passwordHash;
    existing.passwordChangedAt = new Date();
    await existing.save();
    console.log(`Admin password updated for ${email}`);
  } else {
    await User.create({
      name: ADMIN_NAME || "Platform Admin",
      email,
      passwordHash,
      role: ROLES.ADMIN,
      authProvider: "local",
      emailVerified: true,
    });
    console.log(`Admin created: ${email}`);
  }
};

run()
  .catch((err) => {
    console.error("Seed failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());