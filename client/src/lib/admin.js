export const COMPANY_STATUS_LABEL = { pending: "Pending review", approved: "Approved", rejected: "Rejected" };
export const COMPANY_STATUS_TONE = { pending: "plain", approved: "accent", rejected: "danger" };
export const ROLE_TONE = { candidate: "plain", recruiter: "accent", admin: "ink" };

export const PROVIDER_LABEL = { local: "Email and password", google: "Google", both: "Email and Google" };

export const ACTION_LABEL = {
  COMPANY_APPROVED: "Company approved",
  COMPANY_REJECTED: "Company rejected",
  JOB_APPROVED: "Job approved",
  JOB_REJECTED: "Job rejected or taken down",
  USER_BLOCKED: "User blocked",
  USER_UNBLOCKED: "User unblocked",
  USER_DELETED: "User deleted",
  STAGE_CHANGED: "Application stage changed",
  RESUME_DOWNLOADED: "Resume downloaded",
  APPLICANTS_EXPORTED: "Applicants exported",
  INTERVIEW_SCHEDULED: "Interview scheduled",
  INTERVIEW_CANCELLED: "Interview cancelled",
  PASSWORD_CHANGED: "Password changed",
};

export const actionLabel = (action = "") =>
  ACTION_LABEL[action] || action.toLowerCase().replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

const clip = (s, n = 80) => (s.length > n ? `${s.slice(0, n)}…` : s);

// The details of an audit entry are free-form, so they are flattened and shortened for display
export const metaPairs = (meta) => {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return [];
  return Object.entries(meta)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .slice(0, 8)
    .map(([k, v]) => [k, clip(typeof v === "object" ? JSON.stringify(v) : String(v))]);
};