import Job from "../models/Job.js";
import Application from "../models/Application.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { APPLICATION_STAGES, JOB_STATUS } from "../utils/constants.js";

const DAY = 24 * 60 * 60 * 1000;
const TZ = process.env.ANALYTICS_TZ || "Asia/Kolkata"; 
const FUNNEL = ["applied", "shortlisted", "interview", "offered"];

const parseDays = (v) => Math.min(Math.max(parseInt(v) || 30, 1), 90);
const dayKey = (date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(date); 
const rate = (part, whole) => (whole ? Math.round((part / whole) * 1000) / 10 : null); 

const buildFunnel = async (jobIds) => {
  const [r] = await Application.aggregate([
    { $match: { jobId: { $in: jobIds } } },
    {
      $facet: {
        reached: [
          { $project: { reached: { $ifNull: ["$stageHistory.to", []] } } },
          {
            $group: {
              _id: null,
              applied: { $sum: 1 },
              shortlisted: { $sum: { $cond: [{ $in: ["shortlisted", "$reached"] }, 1, 0] } },
              interview: { $sum: { $cond: [{ $in: ["interview", "$reached"] }, 1, 0] } },
              offered: { $sum: { $cond: [{ $in: ["offered", "$reached"] }, 1, 0] } },
            },
          },
        ],
        current: [{ $group: { _id: "$stage", count: { $sum: 1 } } }],
      },
    },
  ]);

  const reached = r.reached[0] || { applied: 0, shortlisted: 0, interview: 0, offered: 0 };
  const funnel = FUNNEL.map((stage, i) => ({
    stage,
    count: reached[stage],
    fromPrevious: i ? rate(reached[stage], reached[FUNNEL[i - 1]]) : null,
    fromApplied: i ? rate(reached[stage], reached.applied) : null,
  }));

  const currentStages = Object.fromEntries(APPLICATION_STAGES.map((s) => [s, 0]));
  for (const row of r.current) currentStages[row._id] = row.count;

  return { total: reached.applied, funnel, currentStages };
};

const buildTimeline = async (jobIds, days) => {
  const since = new Date(Date.now() - days * DAY);
  const rows = await Application.aggregate([
    { $match: { jobId: { $in: jobIds }, createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TZ } },
        count: { $sum: 1 },
      },
    },
  ]);
  const counts = new Map(rows.map((r) => [r._id, r.count]));

  const timeline = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = dayKey(new Date(Date.now() - i * DAY));
    timeline.push({ date, count: counts.get(date) || 0 });
  }
  return timeline;
};

const buildTopJobs = async (jobIds) => {
  const top = await Application.aggregate([
    { $match: { jobId: { $in: jobIds } } },
    { $group: { _id: "$jobId", applications: { $sum: 1 }, avgMatch: { $avg: "$matchScore" } } },
    { $sort: { applications: -1, _id: 1 } },
    { $limit: 5 },
  ]);
  const jobs = await Job.find({ _id: { $in: top.map((t) => t._id) } }).select("title status").lean();
  const byId = new Map(jobs.map((j) => [j._id.toString(), j]));

  return top.map((t) => ({
    jobId: t._id,
    title: byId.get(t._id.toString())?.title,
    status: byId.get(t._id.toString())?.status,
    applications: t.applications,
    avgMatchScore: t.avgMatch == null ? null : Math.round(t.avgMatch * 10) / 10,
  }));
};

const sum = (timeline) => timeline.reduce((n, d) => n + d.count, 0);

export const recruiterOverview = asyncHandler(async (req, res) => {
  const days = parseDays(req.query.days);

  const jobs = await Job.find({ recruiterId: req.user._id }).select("_id status").lean();
  const jobIds = jobs.map((j) => j._id);

  const byStatus = Object.fromEntries(JOB_STATUS.map((s) => [s, 0]));
  for (const j of jobs) byStatus[j.status] += 1;

  const [{ total, funnel, currentStages }, timeline, topJobs] = await Promise.all([
    buildFunnel(jobIds),
    buildTimeline(jobIds, days),
    buildTopJobs(jobIds),
  ]);

  res.json({
    range: { days, timezone: TZ },
    jobs: { total: jobs.length, byStatus },
    applications: { total, inRange: sum(timeline), funnel, currentStages },
    timeline,
    topJobs,
  });
});

export const jobFunnel = asyncHandler(async (req, res) => {
  const days = parseDays(req.query.days);

  const job = await Job.findOne({ _id: req.params.id, recruiterId: req.user._id })
    .select("title status")
    .lean();
  if (!job) throw new ApiError(404, "Job not found");

  const [{ total, funnel, currentStages }, timeline] = await Promise.all([
    buildFunnel([job._id]),
    buildTimeline([job._id], days),
  ]);

  res.json({
    job: { id: job._id, title: job.title, status: job.status },
    range: { days, timezone: TZ },
    applications: { total, inRange: sum(timeline), funnel, currentStages },
    timeline,
  });
});