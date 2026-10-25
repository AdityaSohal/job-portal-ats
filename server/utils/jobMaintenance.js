import Job from "../models/Job.js";
import JobAlert from "../models/JobAlert.js";
import User from "../models/User.js";
import { sendEmail } from "./sendEmail.js";
import { jobAlertEmail } from "./emailTemplates.js";

const HOUR = 60 * 60 * 1000;
const MAX_ALERTS_PER_RUN = 50; 
const MAX_JOBS_PER_EMAIL = 10;
const CONCURRENCY = 5;
const LEASE_MS = 5 * 60 * 1000;
const TIME_BUDGET_MS = Number(process.env.CRON_TIME_BUDGET_MS) || 20000;

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const baseUrl = () =>
  (process.env.CLIENT_URL || "http://localhost:5173").split(",")[0].trim().replace(/\/$/, "");

export const closeExpiredJobs = async () => {
  const { modifiedCount } = await Job.updateMany(
    { status: { $in: ["pending", "active", "suspended"] }, deadline: { $lte: new Date() } },
    { $set: { status: "expired" } }
  );
  return { expired: modifiedCount };
};

const jobFilterFor = (f = {}, since, until) => {
  const and = [
    { status: "active" },
    { $or: [{ deadline: null }, { deadline: { $gt: until } }] },
    {
      $or: [
        { reviewedAt: { $gt: since, $lte: until } },
        { reviewedAt: null, createdAt: { $gt: since, $lte: until } },
      ],
    },
  ];
  if (f.q) and.push({ $text: { $search: f.q } });
  if (f.location) and.push({ location: { $regex: escapeRegex(f.location), $options: "i" } });
  if (f.workMode?.length) and.push({ workMode: { $in: f.workMode } });
  if (f.employmentType?.length) and.push({ employmentType: { $in: f.employmentType } });
  if (f.exp != null) and.push({ minExp: { $lte: f.exp } });
  if (f.ctc != null) and.push({ "ctcRange.max": { $gte: f.ctc } });
  if (f.skills?.length) and.push({ skills: { $in: f.skills } });
  return { $and: and };
};

const processAlert = async (alert, user, runStart, stats) => {
  const previous = alert.lastSentAt ?? null;
  const since = alert.lastSentAt || alert.createdAt;
  const now = new Date();

  const leased = await JobAlert.findOneAndUpdate(
    {
      _id: alert._id,
      lastSentAt: previous,
      $or: [{ processingUntil: null }, { processingUntil: { $lte: now } }],
    },
    { $set: { processingUntil: new Date(now.getTime() + LEASE_MS) } }
  );
  if (!leased) {
    stats.skipped += 1;
    return;
  }

  try {
    const filter = jobFilterFor(alert.filters, since, runStart);
    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .sort({ createdAt: -1 })
        .limit(MAX_JOBS_PER_EMAIL)
        .select("title location workMode ctcRange companyId")
        .populate("companyId", "name")
        .lean(),
      Job.countDocuments(filter),
    ]);

    if (total) {
      await sendEmail({ to: user.email, ...jobAlertEmail(alert.name, jobs, total, baseUrl()) });
      stats.emailed += 1;
    } else {
      stats.noMatches += 1;
    }

    await JobAlert.updateOne(
      { _id: alert._id },
      { $set: { lastSentAt: runStart }, $unset: { processingUntil: 1 } }
    );
  } catch (err) {
    console.error(`Alert ${alert._id} failed:`, err.message);
    stats.failed += 1;
    await JobAlert.updateOne({ _id: alert._id }, { $unset: { processingUntil: 1 } }).catch(() => {});
  }
};

export const sendDueAlerts = async () => {
  const runStart = new Date();
  const stats = { due: 0, emailed: 0, noMatches: 0, skipped: 0, failed: 0, removed: 0, deferred: 0 };

  const dailyCutoff = new Date(runStart - 23 * HOUR);
  const weeklyCutoff = new Date(runStart - 167 * HOUR);

  const alerts = await JobAlert.find({
    isActive: true,
    $and: [
      { $or: [{ processingUntil: null }, { processingUntil: { $lte: runStart } }] },
      {
        $or: [
          { frequency: "daily", $or: [{ lastSentAt: null }, { lastSentAt: { $lte: dailyCutoff } }] },
          { frequency: "weekly", $or: [{ lastSentAt: null }, { lastSentAt: { $lte: weeklyCutoff } }] },
        ],
      },
    ],
  })
    .sort({ lastSentAt: 1 }) 
    .limit(MAX_ALERTS_PER_RUN)
    .lean();

  stats.due = alerts.length;

  const users = await User.find({ _id: { $in: alerts.map((a) => a.userId) } })
    .select("email isBlocked")
    .lean();
  const userById = new Map(users.map((u) => [u._id.toString(), u]));

  const work = [];
  for (const alert of alerts) {
    const user = userById.get(alert.userId.toString());
    if (!user) {
      await JobAlert.deleteOne({ _id: alert._id }); 
      stats.removed += 1;
    } else if (user.isBlocked) {
      stats.skipped += 1;
    } else {
      work.push({ alert, user });
    }
  }
  const deadline = Date.now() + TIME_BUDGET_MS;
  for (let i = 0; i < work.length; i += CONCURRENCY) {
    if (Date.now() > deadline) {
      stats.deferred = work.length - i;
      break;
    }
    await Promise.all(
      work.slice(i, i + CONCURRENCY).map(({ alert, user }) => processAlert(alert, user, runStart, stats))
    );
  }

  return stats;
};