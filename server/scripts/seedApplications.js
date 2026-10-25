import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import CandidateProfile from "../models/CandidateProfile.js";
import Job from "../models/Job.js";
import Application from "../models/Application.js";
import SavedJob from "../models/SavedJob.js";
import { ROLES } from "../utils/constants.js";
import { skillBreakdown } from "../utils/matchScore.js";

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

const CANDIDATES = {
  1: ["react", "node.js", "mongodb", "express"],
  2: ["react", "javascript", "tailwind css"],
  3: ["node.js", "express", "mongodb"],
  4: ["python", "sql"],
  5: ["react", "node.js", "mongodb"],
  6: ["docker", "aws", "kubernetes"],
  7: ["javascript", "git", "react"],
  8: ["node.js", "javascript"],
  9: ["docker", "aws"],
  10: ["react", "mongodb"],
  11: ["node.js", "express"],
  12: ["python", "sql", "excel"],
};

const APPS = [
  [1, "nimbus", "Backend Developer", "applied>shortlisted>interview>offered", 25],
  [3, "nimbus", "Backend Developer", "applied>shortlisted>interview>rejected", 22],
  [5, "nimbus", "Backend Developer", "applied>shortlisted>interview", 18],
  [8, "nimbus", "Backend Developer", "applied>shortlisted>rejected", 15],
  [11, "nimbus", "Backend Developer", "applied>shortlisted", 10],
  [10, "nimbus", "Backend Developer", "applied>rejected", 8],
  [4, "nimbus", "Backend Developer", "applied", 3],
  [7, "nimbus", "Backend Developer", "applied>withdrawn", 1],
  [2, "nimbus", "Frontend Developer", "applied>shortlisted>interview", 20],
  [7, "nimbus", "Frontend Developer", "applied>shortlisted", 12],
  [1, "nimbus", "Frontend Developer", "applied", 6],
  [5, "nimbus", "Frontend Developer", "applied>rejected", 5],
  [10, "nimbus", "Frontend Developer", "applied", 2],
  [8, "nimbus", "Frontend Developer", "applied", 0],
  [1, "orbit", "Full Stack Developer", "applied>shortlisted>interview>offered", 14],
  [5, "orbit", "Full Stack Developer", "applied>shortlisted", 9],
  [2, "orbit", "Full Stack Developer", "applied", 8],
  [9, "orbit", "Full Stack Developer", "applied>rejected", 6],
  [12, "orbit", "Full Stack Developer", "applied", 2],
  [3, "orbit", "Full Stack Developer", "applied>shortlisted>withdrawn", 11],
  [6, "orbit", "Full Stack Developer", "applied", 1],
  [6, "orbit", "DevOps Engineer", "applied>shortlisted>interview", 16],
  [9, "orbit", "DevOps Engineer", "applied>shortlisted", 5],
  [12, "orbit", "DevOps Engineer", "applied>rejected", 4],
  [4, "orbit", "DevOps Engineer", "applied", 1],
];

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const old = await User.find({ email: /^cand\d+@demo\.jobportal\.test$/ }).select("_id");
  const oldIds = old.map((u) => u._id);
  await Application.deleteMany({ $or: [{ candidateId: { $in: oldIds } }, { resumeKey: /^demo\// }] });
  await CandidateProfile.deleteMany({ $or: [{ userId: { $in: oldIds } }, { headline: /^\[demo\]/ }] });
  await User.deleteMany({ _id: { $in: oldIds } });

  const liveJobIds = await Job.distinct("_id");
  const orphanApps = await Application.deleteMany({ jobId: { $nin: liveJobIds } });
  const orphanSaved = await SavedJob.deleteMany({ jobId: { $nin: liveJobIds } });
  if (orphanApps.deletedCount || orphanSaved.deletedCount) {
    console.log(`Removed ${orphanApps.deletedCount} applications and ${orphanSaved.deletedCount} saved jobs that pointed to deleted jobs`);
  }

  const owners = {};
  for (const key of ["nimbus", "orbit"]) {
    owners[key] = await User.findOne({ email: `${key}@demo.jobportal.test` });
    if (!owners[key]) throw new Error("Demo recruiters not found. Run: npm run seed:jobs");
  }
  const jobs = new Map();
  for (const key of Object.keys(owners)) {
    const rows = await Job.find({ recruiterId: owners[key]._id });
    for (const j of rows) jobs.set(`${key}:${j.title}`, j);
  }

  const passwordHash = await bcrypt.hash("Demo1234", 12);
  const candidates = {};
  for (const [n, skills] of Object.entries(CANDIDATES)) {
    const user = await User.create({
      name: `Demo Candidate ${n}`,
      email: `cand${n}@demo.jobportal.test`,
      passwordHash,
      role: ROLES.CANDIDATE,
      emailVerified: true,
    });
    await CandidateProfile.create({
      userId: user._id,
      headline: `[demo] Candidate ${n}`,
      skills,
      experienceYears: 1,
    });
    candidates[n] = { user, skills };
  }

  for (const [n, key, title, path, daysAgo] of APPS) {
    const job = jobs.get(`${key}:${title}`);
    if (!job) throw new Error(`Job not found: ${title}. Run: npm run seed:jobs`);

    const { user, skills } = candidates[n];
    const stages = path.split(">");
    const createdAt = new Date(Date.now() - daysAgo * DAY - 60 * 1000);

    const stageHistory = stages.map((to, i) => ({
      from: i ? stages[i - 1] : undefined,
      to,
      changedBy: to === "applied" || to === "withdrawn" ? user._id : owners[key]._id,
      at: new Date(Math.min(createdAt.getTime() + i * 6 * HOUR, Date.now())),
    }));

    await Application.create({
      jobId: job._id,
      candidateId: user._id,
      resumeKey: `demo/candidate-${n}.pdf`, 
      resumeName: `Candidate ${n} Resume.pdf`,
      coverNote: `Hello, I am interested in the ${title} role.`,
      stage: stages.at(-1),
      stageHistory,
      matchScore: skillBreakdown(skills, job.skills).score,
      createdAt,
    });
  }

  const oldest = await Application.findOne({ resumeKey: /^demo\// }).sort({ createdAt: 1 }).select("createdAt");
  console.log(`Seeded ${Object.keys(CANDIDATES).length} candidates and ${APPS.length} applications`);
  console.log(`Oldest application: ${oldest.createdAt.toISOString()} (should be about 25 days ago)`);
  console.log("Demo candidates: cand1@demo.jobportal.test ... cand12@demo.jobportal.test, password Demo1234");
};

run()
  .catch((err) => {
    console.error("Seed failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());