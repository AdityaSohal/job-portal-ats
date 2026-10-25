import asyncHandler from "../utils/asyncHandler.js";
import { closeExpiredJobs, sendDueAlerts } from "../utils/jobMaintenance.js";

const TASKS = { expiredJobs: closeExpiredJobs, alerts: sendDueAlerts };

export const runDaily = asyncHandler(async (req, res) => {
  const results = {};
  let failed = false;

  for (const [name, task] of Object.entries(TASKS)) {
    try {
      results[name] = await task();
    } catch (err) {
      console.error(`Cron task "${name}" failed:`, err.message);
      results[name] = { error: "failed" };
      failed = true;
    }
  }

  res.status(failed ? 500 : 200).json({ ranAt: new Date().toISOString(), ...results });
});