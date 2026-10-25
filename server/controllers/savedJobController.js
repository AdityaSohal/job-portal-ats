import SavedJob from "../models/SavedJob.js";
import Job from "../models/Job.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { visibleNow } from "./publicJobController.js";

const MAX_SAVED = 100;

const unavailableReason = (job) => {
  if (job.status === "closed") return "closed";
  if (job.status === "active" && (!job.deadline || job.deadline > new Date())) return null;
  if (job.status === "expired" || (job.deadline && job.deadline <= new Date())) return "expired";
  return "unavailable";
};

export const saveJob = asyncHandler(async (req, res) => {
  const { jobId } = req.body;
  const userId = req.user._id;

  if (!(await Job.exists({ _id: jobId, ...visibleNow() }))) {
    throw new ApiError(404, "Job not found or no longer available");
  }

  if (await SavedJob.exists({ userId, jobId })) return res.json({ saved: true });

  if ((await SavedJob.countDocuments({ userId })) >= MAX_SAVED) {
    throw new ApiError(409, `You can save up to ${MAX_SAVED} jobs. Remove one first.`);
  }

  try {
    await SavedJob.create({ userId, jobId });
  } catch (err) {
    if (err.code === 11000) return res.json({ saved: true }); 
    throw err;
  }
  res.status(201).json({ saved: true });
});

export const unsaveJob = asyncHandler(async (req, res) => {
  const { deletedCount } = await SavedJob.deleteOne({ userId: req.user._id, jobId: req.params.jobId });
  if (!deletedCount) throw new ApiError(404, "This job is not in your saved list");
  res.json({ saved: false });
});

export const getSavedIds = asyncHandler(async (req, res) => {
  const rows = await SavedJob.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(MAX_SAVED)
    .select("jobId")
    .lean();
  res.json({ ids: rows.map((r) => r.jobId) });
});

export const listSaved = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  const filter = { userId: req.user._id };

  const [rows, total] = await Promise.all([
    SavedJob.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({
        path: "jobId",
        select: "title location workMode employmentType minExp ctcRange status deadline companyId",
        populate: { path: "companyId", select: "name logoUrl" },
      })
      .lean(),
    SavedJob.countDocuments(filter),
  ]);

  const items = rows
    .filter((r) => r.jobId) 
    .map((r) => {
      const j = r.jobId;
      const reason = unavailableReason(j);
      return {
        savedAt: r.createdAt,
        available: reason === null,
        ...(reason && { unavailableReason: reason }),
        job: {
          id: j._id,
          title: j.title,
          location: j.location,
          workMode: j.workMode,
          employmentType: j.employmentType,
          minExp: j.minExp,
          ctcRange: j.ctcRange,
          deadline: j.deadline,
          company: j.companyId,
        },
      };
    });

  res.json({ items, page, limit, total, pages: Math.ceil(total / limit) });
});