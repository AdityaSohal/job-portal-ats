import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Company from "../models/Company.js";
import Job from "../models/Job.js";
import { ROLES } from "../utils/constants.js";

const DEMO = "@demo.jobportal.test";
const day = 24 * 60 * 60 * 1000;
const inDays = (n) => (n == null ? undefined : new Date(Date.now() + n * day));

const COMPANIES = [
  { key: "nimbus", name: "Nimbus Labs", location: "Bengaluru", industry: "Software" },
  { key: "orbit", name: "Orbit Systems", location: "Pune", industry: "IT Services" },
];

const JOBS = [
  ["nimbus", "Backend Developer", "Bengaluru", "hybrid", "full-time", 1, [6, 12], ["node.js", "express", "mongodb"], 45],
  ["nimbus", "Frontend Developer", "Bengaluru", "remote", "full-time", 0, [4, 8], ["react", "javascript", "tailwind css"], 30],
  ["orbit", "Full Stack Developer", "Pune", "hybrid", "full-time", 2, [10, 18], ["react", "node.js", "mongodb"], null],
  ["orbit", "DevOps Engineer", "Pune", "onsite", "full-time", 3, [12, 22], ["docker", "aws", "kubernetes"], 60],
  ["nimbus", "Data Analyst", "Hyderabad", "onsite", "full-time", 1, [5, 9], ["sql", "python", "excel"], 20],
  ["orbit", "UI/UX Designer", "Bengaluru", "remote", "contract", 2, [6, 10], ["figma", "ux research"], 25],
  ["nimbus", "Software Engineering Intern", "Bengaluru", "onsite", "internship", 0, [1, 2], ["javascript", "git"], 15],
  ["orbit", "QA Engineer", "Chennai", "hybrid", "full-time", 2, [5, 9], ["selenium", "java", "testing"], null],
  ["nimbus", "Machine Learning Engineer", "Bengaluru", "hybrid", "full-time", 3, [15, 28], ["python", "tensorflow", "sql"], 50],
  ["orbit", "Mobile App Developer", "Pune", "remote", "part-time", 1, [4, 7], ["react native", "javascript"], 35],
  ["orbit", "Backend Engineer (Java)", "Hyderabad", "onsite", "full-time", 4, [14, 24], ["java", "spring boot", "mysql"], 40],
  ["nimbus", "Technical Support Executive", "Chennai", "onsite", "full-time", 0, [3, 5], ["communication", "troubleshooting"], 10],
  ["nimbus", "Expired Deadline Job", "Bengaluru", "remote", "full-time", 1, [5, 8], ["testing"], -5],
  ["nimbus", "Pending Review Job", "Bengaluru", "remote", "full-time", 1, [5, 8], ["testing"], 30, "pending"],
];

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const old = await User.find({ email: new RegExp(`${DEMO.replace(".", "\\.")}$`) }).select("_id");
  const oldIds = old.map((u) => u._id);
  await Job.deleteMany({ recruiterId: { $in: oldIds } });
  await Company.deleteMany({ createdBy: { $in: oldIds } });
  await User.deleteMany({ _id: { $in: oldIds } });

  const passwordHash = await bcrypt.hash("Demo1234", 12);
  const owners = {};

  for (const c of COMPANIES) {
    const user = await User.create({
      name: `${c.name} Recruiter`,
      email: `${c.key}${DEMO}`,
      passwordHash,
      role: ROLES.RECRUITER,
      emailVerified: true,
    });
    const company = await Company.create({
      name: c.name,
      location: c.location,
      industry: c.industry,
      createdBy: user._id,
      status: "approved",
    });
    user.companyId = company._id;
    await user.save();
    owners[c.key] = { user, company };
  }

  for (const [key, title, location, workMode, employmentType, minExp, ctc, skills, days, status] of JOBS) {
    const { user, company } = owners[key];
    await Job.create({
      recruiterId: user._id,
      companyId: company._id,
      title,
      description: `${title} at ${company.name}. You will work with ${skills.join(", ")} in a collaborative team and ship features end to end.`,
      skills,
      location,
      workMode,
      employmentType,
      minExp,
      maxExp: minExp + 3,
      ctcRange: { min: ctc[0], max: ctc[1] },
      deadline: inDays(days),
      status: status || "active",
    });
  }

  console.log(`Seeded ${COMPANIES.length} companies and ${JOBS.length} jobs (12 public, 2 hidden)`);
  console.log("Demo recruiters: nimbus@demo.jobportal.test and orbit@demo.jobportal.test, password Demo1234");
};

run()
  .catch((err) => {
    console.error("Seed failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());