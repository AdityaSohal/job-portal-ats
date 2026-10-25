import mongoose from "mongoose";
import User from "../models/User.js";
import Company from "../models/Company.js";
import CandidateProfile from "../models/CandidateProfile.js";
import Job from "../models/Job.js";
import Application from "../models/Application.js";
import SavedJob from "../models/SavedJob.js";
import AuditLog from "../models/AuditLog.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import JobAlert from "../models/JobAlert.js";
import { ROLES } from "../utils/constants.js";
import { deletePrivate } from "../utils/cloudinary.js";

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const FIELDS =
  "name email role isBlocked blockedReason blockedAt authProvider emailVerified lastLoginAt createdAt companyId";

const audit = (req, action, targetId, meta) =>
  AuditLog.create({
    actorId: req.user._id,
    action,
    targetType: "User",
    targetId,
    meta,
    ip: req.ip,
  });

const loadTarget = async (id) => {
  const target = await User.findById(id).select("name email role companyId isBlocked");
  if (!target) throw new ApiError(404, "User not found");
  if (target.role === ROLES.ADMIN) throw new ApiError(403, "Admin accounts cannot be changed from here");
  return target;
};

export const listUsers = asyncHandler(async (req, res) => {
  const { role, status } = req.query;
  const q = req.query.q?.trim();
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);

  const filter = {};
  if (role) filter.role = role;
  if (status === "blocked") filter.isBlocked = true;
  if (status === "active") filter.isBlocked = { $ne: true };
  if (q) {
    const re = escapeRegex(q);
    filter.$or = [{ name: { $regex: re, $options: "i" } }, { email: { $regex: re, $options: "i" } }];
  }

  const [items, total] = await Promise.all([
    User.find(filter)
      .select(FIELDS)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("companyId", "name status")
      .lean(),
    User.countDocuments(filter),
  ]);

  res.json({ items, page, limit, total, pages: Math.ceil(total / limit) });
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select(FIELDS).populate("companyId", "name status").lean();
  if (!user) throw new ApiError(404, "User not found");

  let activity = {};

  if (user.role === ROLES.CANDIDATE) {
    const [profile, byStage, savedJobs] = await Promise.all([
      CandidateProfile.findOne({ userId: user._id }).select("profileCompletion resumes skills").lean(),
      Application.aggregate([
        { $match: { candidateId: user._id } },
        { $group: { _id: "$stage", count: { $sum: 1 } } },
      ]),
      SavedJob.countDocuments({ userId: user._id }),
    ]);
    const applications = Object.fromEntries(byStage.map((r) => [r._id, r.count]));
    activity = {
      profileCompletion: profile?.profileCompletion ?? 0,
      resumes: profile?.resumes?.length ?? 0,
      skills: profile?.skills?.length ?? 0,
      savedJobs,
      applicationsTotal: Object.values(applications).reduce((a, b) => a + b, 0),
      applications,
    };
  }

  if (user.role === ROLES.RECRUITER) {
    const [byStatus, jobIds] = await Promise.all([
      Job.aggregate([
        { $match: { recruiterId: user._id } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Job.distinct("_id", { recruiterId: user._id }),
    ]);
    activity = {
      jobsTotal: jobIds.length,
      jobs: Object.fromEntries(byStatus.map((r) => [r._id, r.count])),
      applicationsReceived: await Application.countDocuments({ jobId: { $in: jobIds } }),
    };
  }

  res.json({ user, activity });
});

export const blockUser = asyncHandler(async (req, res) => {
  const target = await loadTarget(req.params.id);

  const set = { isBlocked: true, blockedAt: new Date() };
  if (req.body.reason) set.blockedReason = req.body.reason;

  const user = await User.findOneAndUpdate(
    { _id: target._id, isBlocked: { $ne: true } },
    { $set: set },
    { new: true }
  ).select(FIELDS);
  if (!user) throw new ApiError(409, "This user is already blocked");

  let closedJobs = 0;
  if (user.role === ROLES.RECRUITER) {
    const result = await Job.updateMany(
      { recruiterId: user._id, status: { $in: ["pending", "active"] } },
      { $set: { status: "closed" } }
    );
    closedJobs = result.modifiedCount;
  }

  await audit(req, "USER_BLOCKED", user._id, {
    email: user.email,
    role: user.role,
    reason: req.body.reason,
    closedJobs,
  });
  res.json({ user, closedJobs });
});

export const unblockUser = asyncHandler(async (req, res) => {
  const target = await loadTarget(req.params.id);

  const user = await User.findOneAndUpdate(
    { _id: target._id, isBlocked: true },
    { $set: { isBlocked: false }, $unset: { blockedReason: "", blockedAt: "" } },
    { new: true }
  ).select(FIELDS);
  if (!user) throw new ApiError(409, "This user is not blocked");

  await audit(req, "USER_UNBLOCKED", user._id, { email: user.email, role: user.role });
  res.json({ user });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const target = await loadTarget(req.params.id);
  const id = target._id;
  let removed = {};

  if (target.role === ROLES.CANDIDATE) {
    const [profile, apps] = await Promise.all([
      CandidateProfile.findOne({ userId: id }).select("resumes.key").lean(),
      Application.find({ candidateId: id }).select("resumeKey").lean(),
    ]);

    const keys = new Set(
      [...(profile?.resumes || []).map((r) => r.key), ...apps.map((a) => a.resumeKey)].filter((k) =>
        k?.startsWith(`resumes/${id}/`)
      )
    );

        await Promise.all([
      Application.deleteMany({ candidateId: id }),
      SavedJob.deleteMany({ userId: id }),
      JobAlert.deleteMany({ userId: id }),
      CandidateProfile.deleteOne({ userId: id }),
    ]);
    await Promise.allSettled([...keys].map((k) => deletePrivate(k)));

    removed = { applications: apps.length, files: keys.size };
  } else {
    const jobIds = await Job.distinct("_id", { recruiterId: id });

    if (jobIds.length && (await Application.exists({ jobId: { $in: jobIds } }))) {
      throw new ApiError(409, "This recruiter has jobs with applications. Block the account instead of deleting it.");
    }

    await Promise.all([SavedJob.deleteMany({ jobId: { $in: jobIds } }), Job.deleteMany({ recruiterId: id })]);
    if (target.companyId) await Company.deleteOne({ _id: target.companyId, createdBy: id });

    removed = { jobs: jobIds.length, company: !!target.companyId };
  }

  await User.deleteOne({ _id: id });

  await audit(req, "USER_DELETED", id, { email: target.email, name: target.name, role: target.role, removed });
  res.json({ message: "User deleted", removed });
});