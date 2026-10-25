import Interview from "../models/Interview.js";

export const closeOpenInterviews = (applicationId, status) =>
  Interview.updateMany({ applicationId, open: true }, { $set: { status, open: false } });

export const interviewView = (i) => ({
  id: i._id,
  applicationId: i.applicationId,
  jobId: i.jobId?._id ?? i.jobId,
  scheduledAt: i.scheduledAt,
  durationMinutes: i.durationMinutes,
  mode: i.mode,
  meetingLink: i.meetingLink,
  location: i.location,
  interviewerName: i.interviewerName,
  instructions: i.instructions,
  status: i.status,
  rescheduleReason: i.rescheduleReason,
  createdAt: i.createdAt,
});