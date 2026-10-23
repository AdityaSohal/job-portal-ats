import Job from "../models/Job.js";
import Application from "../models/Application.js";
import SavedJob from "../models/SavedJob.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

const FIELDS = [
  "title", "description", "skills", "location", "workMode", "employmentType",
  "minExp", "maxExp", "ctcRange", "openings", "deadline",
];

const normalizeSkills = (skills) =>
  [...new Set(skills.map((s) => s.trim().toLowerCase()).filter(Boolean))].slice(0, 20);

const pickFields = (body) => {
  const data = {};
  for (const key of FIELDS) if (body[key] !== undefined) data[key] = body[key];
  if (data.skills) data.skills = normalizeSkills(data.skills);
  return data;
};

const checkRanges = (job) => {
  if (job.maxExp != null && job.minExp > job.maxExp) {
    throw new ApiError(400, "Minimum experience cannot exceed maximum experience");
  }
  const { min, max } = job.ctcRange || {};
  if (min != null && max != null && min > max) {
    throw new ApiError(400, "Minimum CTC cannot exceed maximum CTC");
  }
  if ((job.isNew || job.isModified("deadline")) && job.deadline && job.deadline <= new Date()) {
    throw new ApiError(400, "Deadline must be in the future");
  }
};

export const createJob = asyncHandler(async (req, res) => {
  const job = new Job({
    ...pickFields(req.body),
    recruiterId: req.user._id,
    companyId: req.user.companyId,
  });
  checkRanges(job);
  await job.save();
  res.status(201).json({ job });
});

export const listMyJobs = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);

  const filter = { recruiterId: req.user._id };
  if (req.query.status) filter.status = req.query.status;

  const [jobs, total] = await Promise.all([
    Job.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Job.countDocuments(filter),
  ]);

  const counts = await Application.aggregate([
    { $match: { jobId: { $in: jobs.map((j) => j._id) } } },
    { $group: { _id: "$jobId", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));
  const items = jobs.map((j) => ({ ...j, applicantCount: countMap.get(j._id.toString()) || 0 }));

  res.json({ items, page, limit, total, pages: Math.ceil(total / limit) });
});

export const getMyJob = asyncHandler(async (req, res) => {
  const job = await Job.findOne({ _id: req.params.id, recruiterId: req.user._id });
  if (!job) throw new ApiError(404, "Job not found");
  res.json({ job });
});

export const updateJob = asyncHandler(async (req, res) => {
  const job = await Job.findOne({ _id: req.params.id, recruiterId: req.user._id });
  if (!job) throw new ApiError(404, "Job not found");

  if (["closed", "expired"].includes(job.status)) {
    throw new ApiError(409, "Closed or expired jobs cannot be edited");
  }

  job.set(pickFields(req.body));
  checkRanges(job);

  if (job.status === "rejected" && !job.isModified()) {
    throw new ApiError(400, "Make changes before resubmitting a rejected job");
  }

  const contentChanged = job.isModified("title") || job.isModified("description");
  if (job.status === "rejected" || (job.status === "active" && contentChanged)) {
    job.status = "pending";
    job.rejectionReason = undefined;
  }

  await job.save();
  res.json({ job });
});

export const closeJob = asyncHandler(async (req, res) => {
  const job = await Job.findOneAndUpdate(
    { _id: req.params.id, recruiterId: req.user._id, status: { $in: ["pending", "active"] } },
    { status: "closed" },
    { new: true }
  );

  if (!job) {
    const exists = await Job.exists({ _id: req.params.id, recruiterId: req.user._id });
    throw new ApiError(exists ? 409 : 404, exists ? "This job cannot be closed" : "Job not found");
  }
  res.json({ job });
});

export const deleteJob = asyncHandler(async (req, res) => {
  const job = await Job.findOne({ _id: req.params.id, recruiterId: req.user._id }).select("_id");
  if (!job) throw new ApiError(404, "Job not found");

  if (await Application.exists({ jobId: job._id })) {
    throw new ApiError(409, "This job has applications. Close it instead of deleting it.");
  }

  await Promise.all([Job.deleteOne({ _id: job._id }), SavedJob.deleteMany({ jobId: job._id })]);
  res.json({ message: "Job deleted" });
});