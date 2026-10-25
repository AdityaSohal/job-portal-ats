export const ROLES = {
  CANDIDATE: "candidate",
  RECRUITER: "recruiter",
  ADMIN: "admin",
};

export const WORK_MODES = ["onsite", "remote", "hybrid"];
export const EMPLOYMENT_TYPES = ["full-time", "part-time", "internship", "contract"];
export const JOB_STATUS = ["pending", "active", "closed", "rejected", "expired", "suspended"];
export const COMPANY_STATUS = ["pending", "approved", "rejected"];

export const APPLICATION_STAGES = [
  "applied",
  "shortlisted",
  "interview",
  "offered",
  "hired",
  "rejected",
  "withdrawn",
  "declined",
];

export const STAGE_TRANSITIONS = {
  applied: ["shortlisted", "rejected", "withdrawn"],
  shortlisted: ["interview", "rejected", "withdrawn"],
  interview: ["offered", "rejected", "withdrawn"],
  offered: ["hired", "declined", "rejected"],
  hired: [],
  rejected: [],
  withdrawn: [],
  declined: [],
};

export const INTERVIEW_MODES = ["video", "phone", "onsite"];
export const INTERVIEW_STATUS = ["scheduled", "confirmed", "reschedule_requested", "completed", "cancelled"];