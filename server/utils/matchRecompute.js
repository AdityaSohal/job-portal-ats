import Application from "../models/Application.js";
import Job from "../models/Job.js";
import CandidateProfile from "../models/CandidateProfile.js";
import { skillBreakdown } from "./matchScore.js";

const OPEN = ["applied", "shortlisted", "interview", "offered"];
const CHUNK = 500;

const save = async (ops) => {
  for (let i = 0; i < ops.length; i += CHUNK) {
    await Application.bulkWrite(ops.slice(i, i + CHUNK), { ordered: false });
  }
};

const op = (id, score) => ({ updateOne: { filter: { _id: id }, update: { $set: { matchScore: score } } } });

export const recomputeForCandidate = async (userId, skills) => {
  const apps = await Application.find({ candidateId: userId, stage: { $in: OPEN } })
    .select("jobId matchScore")
    .lean();
  if (!apps.length) return 0;

  const jobs = await Job.find({ _id: { $in: apps.map((a) => a.jobId) } }).select("skills").lean();
  const skillsByJob = new Map(jobs.map((j) => [j._id.toString(), j.skills]));

  const ops = [];
  for (const a of apps) {
    const { score } = skillBreakdown(skills, skillsByJob.get(a.jobId.toString()) || []);
    if (score !== a.matchScore) ops.push(op(a._id, score));
  }
  await save(ops);
  return ops.length;
};

export const recomputeForJob = async (jobId, jobSkills) => {
  const apps = await Application.find({ jobId, stage: { $in: OPEN } }).select("candidateId matchScore").lean();
  if (!apps.length) return 0;

  const profiles = await CandidateProfile.find({ userId: { $in: apps.map((a) => a.candidateId) } })
    .select("userId skills")
    .lean();
  const skillsByUser = new Map(profiles.map((p) => [p.userId.toString(), p.skills]));

  const ops = [];
  for (const a of apps) {
    const { score } = skillBreakdown(skillsByUser.get(a.candidateId.toString()) || [], jobSkills);
    if (score !== a.matchScore) ops.push(op(a._id, score));
  }
  await save(ops);
  return ops.length;
};