export const ROLES = {
  CANDIDATE: "candidate",
  RECRUITER: "recruiter",
  ADMIN: "admin",
};

export const WORK_MODES = ["onsite", "remote", "hybrid"];
export const EMPLOYMENT_TYPES = ["full-time", "part-time", "internship", "contract"];
export const JOB_STATUS = ["pending", "active", "closed", "rejected", "expired"];

export const APPLICATION_STAGES = [
  "applied",
  "shortlisted",
  "interview",
  "offered",
  "rejected",
  "withdrawn",
];

export const STAGE_TRANSITIONS = {
  applied: ["shortlisted", "rejected", "withdrawn"],
  shortlisted: ["interview", "rejected", "withdrawn"],
  interview: ["offered", "rejected", "withdrawn"],
  offered: ["rejected", "withdrawn"],
  rejected: [],
  withdrawn: [],
};