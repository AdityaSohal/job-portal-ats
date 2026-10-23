import Job from "../models/Job.js";
import Company from "../models/Company.js";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { sendEmail } from "../utils/sendEmail.js";
import { jobApprovedEmail, jobRejectedEmail } from "../utils/emailTemplates.js";

const audit = (req, action, targetId, meta) =>
  AuditLog.create({
    actorId: req.user._id,
    action,
    targetType: "Job",
    targetId,
    meta,
    ip: req.ip,
  });

const notifyRecruiter = async (job, template) => {
  try {
    const recruiter = await User.findById(job.recruiterId).select("email");
    if (recruiter) await sendEmail({ to: recruiter.email, ...template });
  } catch (err) {
    console.error("Job email failed:", err.message);
  }
};

export const listJobs = asyncHandler(async (req, res) => {
  const status = req.query.status || "pending";
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  const filter = status === "all" ? {} : { status };

  const [items, total] = await Promise.all([
    Job.find(filter)
      .sort({ createdAt: status === "pending" ? 1 : -1 }) 
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("recruiterId", "name email")
      .populate("companyId", "name status"),
    Job.countDocuments(filter),
  ]);

  res.json({ items, page, limit, total, pages: Math.ceil(total / limit) });
});

export const approveJob = asyncHandler(async (req, res) => {
  const existing = await Job.findById(req.params.id).select("companyId");
  if (!existing) throw new ApiError(404, "Job not found");

  const company = await Company.findById(existing.companyId).select("status");
  if (company?.status !== "approved") {
    throw new ApiError(409, "The company for this job is not approved");
  }

  const job = await Job.findOneAndUpdate(
    {
      _id: req.params.id,
      status: "pending",
      $or: [{ deadline: null }, { deadline: { $gt: new Date() } }],
    },
    {
      status: "active",
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
      $unset: { rejectionReason: "" },
    },
    { new: true }
  );

  if (!job) throw new ApiError(409, "Only pending jobs with a future deadline can be approved");

  await audit(req, "JOB_APPROVED", job._id, { title: job.title });
  await notifyRecruiter(job, jobApprovedEmail(job.title));
  res.json({ job });
});

export const rejectJob = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const job = await Job.findOneAndUpdate(
    { _id: req.params.id, status: { $in: ["pending", "active"] } },
    {
      status: "rejected",
      rejectionReason: reason,
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
    },
    { new: true }
  );

  if (!job) {
    const exists = await Job.exists({ _id: req.params.id });
    throw new ApiError(exists ? 409 : 404, exists ? "This job cannot be rejected" : "Job not found");
  }

  await audit(req, "JOB_REJECTED", job._id, { title: job.title, reason });
  await notifyRecruiter(job, jobRejectedEmail(job.title, reason));
  res.json({ job });
});