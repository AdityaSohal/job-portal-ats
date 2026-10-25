import User from "../models/User.js";
import Company from "../models/Company.js";
import Job from "../models/Job.js";
import Application from "../models/Application.js";
import CandidateProfile from "../models/CandidateProfile.js";
import AuditLog from "../models/AuditLog.js";
import asyncHandler from "../utils/asyncHandler.js";
import { ROLES, COMPANY_STATUS, JOB_STATUS, APPLICATION_STAGES } from "../utils/constants.js";
import { visibleNow } from "./publicJobController.js";

const DAY = 24 * 60 * 60 * 1000;
const TZ = process.env.ANALYTICS_TZ || "Asia/Kolkata";
const FUNNEL = ["applied", "shortlisted", "interview", "offered"];

const parseDays = (v) => Math.min(Math.max(parseInt(v) || 30, 1), 90);
const dayKey = (date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(date);
const rate = (part, whole) => (whole ? Math.round((part / whole) * 1000) / 10 : null);
const total = (obj) => Object.values(obj).reduce((a, b) => a + b, 0);
const sum = (timeline) => timeline.reduce((n, d) => n + d.count, 0);

const countBy = async (Model, field, keys) => {
  const rows = await Model.aggregate([{ $group: { _id: `$${field}`, count: { $sum: 1 } } }]);
  const out = Object.fromEntries(keys.map((k) => [k, 0]));
  for (const r of rows) out[r._id] = r.count;
  return out;
};

const dailyCounts = async (Model, days) => {
  const rows = await Model.aggregate([
    { $match: { createdAt: { $gte: new Date(Date.now() - days * DAY) } } },
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

const buildFunnel = async () => {
  const [r] = await Application.aggregate([
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

const topSkills = async (Model, match) => {
  const rows = await Model.aggregate([
    { $match: match },
    { $unwind: "$skills" },
    { $group: { _id: "$skills", count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    { $limit: 10 },
  ]);
  return rows.map((r) => ({ skill: r._id, count: r.count }));
};

const topCompanies = async () => {
  const rows = await Application.aggregate([
    { $group: { _id: "$jobId", n: { $sum: 1 } } },
    { $lookup: { from: Job.collection.name, localField: "_id", foreignField: "_id", as: "job" } },
    { $unwind: "$job" },
    { $group: { _id: "$job.companyId", applications: { $sum: "$n" }, jobsWithApplications: { $sum: 1 } } },
    { $sort: { applications: -1, _id: 1 } },
    { $limit: 5 },
  ]);
  const companies = await Company.find({ _id: { $in: rows.map((r) => r._id) } }).select("name").lean();
  const names = new Map(companies.map((c) => [c._id.toString(), c.name]));

  return rows.map((r) => ({
    companyId: r._id,
    name: names.get(r._id.toString()),
    applications: r.applications,
    jobsWithApplications: r.jobsWithApplications,
  }));
};

export const platformOverview = asyncHandler(async (req, res) => {
  const days = parseDays(req.query.days);

  const [
    usersByRole, blockedUsers, companiesByStatus, jobsByStatus, liveJobs,
    applicationData, inDemand, available, companies, signups, jobsPosted, applicationsTimeline,
  ] = await Promise.all([
    countBy(User, "role", Object.values(ROLES)),
    User.countDocuments({ isBlocked: true }),
    countBy(Company, "status", COMPANY_STATUS),
    countBy(Job, "status", JOB_STATUS),
    Job.countDocuments(visibleNow()),
    buildFunnel(),
    topSkills(Job, { status: "active" }),
    topSkills(CandidateProfile, {}),
    topCompanies(),
    dailyCounts(User, days),
    dailyCounts(Job, days),
    dailyCounts(Application, days),
  ]);

  res.json({
    range: { days, timezone: TZ },
    queues: { pendingCompanies: companiesByStatus.pending, pendingJobs: jobsByStatus.pending },
    users: { total: total(usersByRole), byRole: usersByRole, blocked: blockedUsers, newInRange: sum(signups) },
    companies: { total: total(companiesByStatus), byStatus: companiesByStatus },
    jobs: { total: total(jobsByStatus), byStatus: jobsByStatus, liveNow: liveJobs, newInRange: sum(jobsPosted) },
    applications: {
      total: applicationData.total,
      inRange: sum(applicationsTimeline),
      funnel: applicationData.funnel,
      currentStages: applicationData.currentStages,
    },
    skills: { inDemand, available },
    topCompanies: companies,
    timelines: { signups, jobsPosted, applications: applicationsTimeline },
  });
});

export const listAuditLogs = asyncHandler(async (req, res) => {
  const { action, actorId, targetType } = req.query;
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);

  const filter = {};
  if (action) filter.action = action;
  if (actorId) filter.actorId = actorId;
  if (targetType) filter.targetType = targetType;

  const [items, count] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("actorId", "name email role")
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  res.json({ items, page, limit, total: count, pages: Math.ceil(count / limit) });
});