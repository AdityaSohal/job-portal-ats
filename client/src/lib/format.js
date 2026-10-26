const DAY = 86_400_000;
const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export const cap = (s = "") => s.charAt(0).toUpperCase() + s.slice(1);
export const formatDate = (d) => dateFmt.format(new Date(d));

export const timeAgo = (d) => {
  const diff = new Date(d).getTime() - Date.now();
  const abs = Math.abs(diff);
  if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), "minute");
  if (abs < DAY) return rtf.format(Math.round(diff / 3_600_000), "hour");
  if (abs < 30 * DAY) return rtf.format(Math.round(diff / DAY), "day");
  return formatDate(d);
};

export const deadlineInfo = (deadline) => {
  if (!deadline) return null;
  const left = new Date(deadline).getTime() - Date.now();
  const days = Math.ceil(left / DAY);
  if (left <= 0) return { label: "Closed", urgent: true };
  if (days <= 1) return { label: "Closes today", urgent: true };
  if (days <= 7) return { label: `Closes in ${days} days`, urgent: true };
  return { label: `Closes ${formatDate(deadline)}`, urgent: false };
};

export const formatCtc = (range) => {
  const { min, max } = range || {};
  if (min == null && max == null) return null;
  if (min != null && max != null) return min === max ? `₹${min} LPA` : `₹${min}–${max} LPA`;
  return min != null ? `₹${min}+ LPA` : `Up to ₹${max} LPA`;
};

export const formatExp = (min = 0, max) => {
  if (max != null && max !== min) return `${min}–${max} yrs`;
  return min === 0 ? "No experience needed" : `${min}+ yrs`;
};

export const formatSize = (bytes) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

// Only real web links are ever turned into <a href>
export const safeUrl = (url) => (typeof url === "string" && /^https?:\/\//i.test(url) ? url : null);

export const STAGE_LABEL = {
  applied: "Applied",
  shortlisted: "Shortlisted",
  interview: "Interview",
  offered: "Offer received",
  hired: "Hired",
  rejected: "Not selected",
  withdrawn: "Withdrawn",
  declined: "Offer declined",
};

// Skills are stored in the same canonical lowercase form on both sides (the server normalizes them)
export const skillMatch = (mySkills = [], jobSkills = []) => {
  const have = new Set(mySkills);
  const matched = jobSkills.filter((s) => have.has(s));
  const missing = jobSkills.filter((s) => !have.has(s));
  const score = jobSkills.length ? Math.round((matched.length / jobSkills.length) * 100) : null;
  return { score, matched, missing };
};