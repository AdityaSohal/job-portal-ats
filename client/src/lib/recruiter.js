import { getError } from "./api";

const pad = (n) => String(n).padStart(2, "0");

// Date inputs work in the browser's own time zone, so these helpers do too
export const toLocalDate = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
};

export const toLocalDateTime = (d) => {
  const x = new Date(d);
  return `${toLocalDate(x)}T${pad(x.getHours())}:${pad(x.getMinutes())}`;
};

export const todayLocal = () => toLocalDate(new Date());

// A deadline means "until the end of that day"
export const endOfLocalDayISO = (date) => new Date(`${date}T23:59:59`).toISOString();

export const JOB_STATUS_LABEL = {
  pending: "Pending review",
  active: "Live",
  closed: "Closed",
  rejected: "Rejected",
  expired: "Expired",
  suspended: "Hidden",
};
export const JOB_STATUS_TONE = {
  pending: "plain",
  active: "accent",
  closed: "plain",
  rejected: "danger",
  expired: "plain",
  suspended: "danger",
};

// Recruiter wording (candidates see different labels)
export const RSTAGE_LABEL = {
  applied: "Applied",
  shortlisted: "Shortlisted",
  interview: "Interview",
  offered: "Offered",
  hired: "Hired",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  declined: "Declined offer",
};
export const RSTAGE_TONE = {
  applied: "plain",
  shortlisted: "accent",
  interview: "accent",
  offered: "ink",
  hired: "ink",
  rejected: "danger",
  withdrawn: "plain",
  declined: "plain",
};

export const INTERVIEW_LABEL = {
  scheduled: "Awaiting confirmation",
  confirmed: "Confirmed",
  reschedule_requested: "Reschedule requested",
  completed: "Completed",
  cancelled: "Cancelled",
};
export const INTERVIEW_TONE = {
  scheduled: "plain",
  confirmed: "accent",
  reschedule_requested: "danger",
  completed: "ink",
  cancelled: "plain",
};
export const OPEN_INTERVIEW = ["scheduled", "confirmed", "reschedule_requested"];

export const STAGE_ACTIONS = {
  shortlisted: { label: "Shortlist", title: "Shortlist this candidate", text: "The candidate is emailed that they were shortlisted." },
  interview: { label: "Move to interview", title: "Move to the interview stage", text: "The candidate is emailed. You can schedule an interview afterwards." },
  offered: { label: "Make an offer", title: "Make an offer", text: "The candidate is emailed and can accept or decline from their dashboard." },
  rejected: { label: "Reject", title: "Reject this application", text: "The candidate is emailed. This can't be undone." },
};

// Downloads come back as a blob, so an error body arrives as a blob too
export const getBlobError = async (error) => {
  const data = error.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text());
      return getError({ response: { status: error.response.status, data: parsed } }).message;
    } catch {
      // fall through to the generic message
    }
  }
  return getError(error).message;
};