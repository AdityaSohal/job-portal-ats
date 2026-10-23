import Job from "../models/Job.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const csv = (v) => String(v).split(",").map((s) => s.trim()).filter(Boolean);

const HIDDEN = { recruiterId: 0, reviewedBy: 0, reviewedAt: 0, rejectionReason: 0, __v: 0 };

const COMPANY_FIELDS = "name logoUrl website description industry size location";

const visibleNow = () => ({
  status: "active",
  $or: [{ deadline: null }, { deadline: { $gt: new Date() } }],
});

const withCompany = ({ companyId, ...job }) => ({ ...job, company: companyId });

export const searchJobs = asyncHandler(async (req, res) => {
  const { location, workMode, employmentType, skills, sort = "latest" } = req.query;
  const q = req.query.q?.trim();
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);

  const filter = visibleNow();

  if (q) filter.$text = { $search: q };
  if (location) filter.location = { $regex: escapeRegex(location.trim()), $options: "i" };
  if (workMode) filter.workMode = { $in: csv(workMode) };
  if (employmentType) filter.employmentType = { $in: csv(employmentType) };

  if (req.query.exp !== undefined && req.query.exp !== "") {
    filter.minExp = { $lte: Number(req.query.exp) };
  }
  if (req.query.ctc !== undefined && req.query.ctc !== "") {
    filter["ctcRange.max"] = { $gte: Number(req.query.ctc) };
  }
  if (skills) {
    const list = csv(skills).map((s) => s.toLowerCase()).slice(0, 10);
    if (list.length) filter.skills = { $in: list };
  }

  let sortSpec;
  const projection = { ...HIDDEN, description: 0 }; 
  if (q) {
    projection.score = { $meta: "textScore" };
    sortSpec = { score: { $meta: "textScore" }, createdAt: -1, _id: -1 };
  } else if (sort === "deadline") {
    filter.deadline = { $gt: new Date() }; 
    sortSpec = { deadline: 1, _id: 1 };
  } else {
    sortSpec = { createdAt: -1, _id: -1 }; 
  }

  const [jobs, total] = await Promise.all([
    Job.find(filter, projection)
      .sort(sortSpec)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("companyId", "name logoUrl location")
      .lean(),
    Job.countDocuments(filter),
  ]);

  res.json({
    items: jobs.map(withCompany),
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  });
});

export const getPublicJob = asyncHandler(async (req, res) => {
  const job = await Job.findOne({ _id: req.params.id, ...visibleNow() }, HIDDEN)
    .populate("companyId", COMPANY_FIELDS)
    .lean();

  if (!job) throw new ApiError(404, "Job not found");
  res.json({ job: withCompany(job) });
});