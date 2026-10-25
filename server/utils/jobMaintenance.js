import Job from "../models/Job.js";
import JobAlert from "../models/JobAlert.js";
import User from "../models/User.js";
import { sendEmail } from "./sendEmail.js";
import { jobAlertEmail } from "./emailTemplates.js";

const HOUR = 60 * 60 * 1000;
const MAX_ALERTS_PER_RUN = 100; 
const MAX_JOBS_PER_EMAIL = 10;

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const baseUrl = () =>
  (process.env.CLIENT_URL || "http://localhost:5173").split(",")[0].trim().replace(/\/$/, "");
export const closeExpiredJobs = async () => {
  const { modifiedCount } = await Job.updateMany(
    { status: { $in: ["pending", "active"] }, deadline: { $lte: new Date() } },
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

export const sendDueAlerts = async () => {
  const runStart = new Date();
  const stats = { due: 0, emailed: 0, noMatches: 0, skipped: 0, failed: 0, removed: 0 };

  const dailyCutoff = new Date(runStart - 23 * HOUR);
  const weeklyCutoff = new Date(runStart - 167 * HOUR);

  const alerts = await JobAlert.find({
    isActive: true,
    $or: [
      { frequency: "daily", $or: [{ lastSentAt: null }, { lastSentAt: { $lte: dailyCutoff } }] },
      { frequency: "weekly", $or: [{ lastSentAt: null }, { lastSentAt: { $lte: weeklyCutoff } }] },
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

  for (const alert of alerts) {
    const user = userById.get(alert.userId.toString());
    if (!user) {
      await JobAlert.deleteOne({ _id: alert._id }); 
      stats.removed += 1;
      continue;
    }
    if (user.isBlocked) {
      stats.skipped += 1;
      continue;
    }

    const previous = alert.lastSentAt ?? null;
    const since = alert.lastSentAt || alert.createdAt;

    const claimed = await JobAlert.findOneAndUpdate(
      { _id: alert._id, lastSentAt: previous },
      { $set: { lastSentAt: runStart } }
    );
    if (!claimed) {
      stats.skipped += 1;
      continue;
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

      if (!total) {
        stats.noMatches += 1;
        continue;
      }

      await sendEmail({ to: user.email, ...jobAlertEmail(alert.name, jobs, total, baseUrl()) });
      stats.emailed += 1;
    } catch (err) {
      console.error(`Alert ${alert._id} failed:`, err.message);
      await JobAlert.updateOne({ _id: alert._id }, { $set: { lastSentAt: previous } });
      stats.failed += 1;
    }
  }

  return stats;
};