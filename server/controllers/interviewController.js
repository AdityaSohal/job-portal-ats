import Interview from "../models/Interview.js";
import Application from "../models/Application.js";
import Job from "../models/Job.js";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { interviewView } from "../utils/interviews.js";
import { writeAudit } from "../utils/audit.js";
import { sendEmailSafe } from "../utils/sendEmail.js";
import { interviewEmail, interviewResponseEmail } from "../utils/emailTemplatesAts.js";

const DAY = 24 * 60 * 60 * 1000;
const FIELDS = ["scheduledAt", "durationMinutes", "mode", "meetingLink", "location", "interviewerName", "instructions"];

const pickFields = (body) => {
  const data = {};
  for (const key of FIELDS) {
    if (body[key] === undefined) continue;
    data[key] = body[key] === "" ? undefined : body[key];
  }
  return data;
};

const checkRules = (iv) => {
  if (iv.isNew || iv.isModified("scheduledAt")) {
    const when = new Date(iv.scheduledAt).getTime();
    if (when <= Date.now()) throw new ApiError(400, "The interview time must be in the future");
    if (when > Date.now() + 365 * DAY) throw new ApiError(400, "The interview time must be within the next year");
  }
  if (iv.mode === "video" && !iv.meetingLink) throw new ApiError(400, "A meeting link is required for video interviews");
  if (iv.mode === "onsite" && !iv.location) throw new ApiError(400, "A location is required for onsite interviews");
};

const jobAndCompany = (jobId) =>
  Job.findById(jobId).select("title companyId").populate("companyId", "name").lean();

const notifyCandidate = async (interview, kind) => {
  const [job, candidate] = await Promise.all([
    jobAndCompany(interview.jobId),
    User.findById(interview.candidateId).select("email").lean(),
  ]);
  if (!candidate) return;
  await sendEmailSafe({
    to: candidate.email,
    ...interviewEmail(kind, {
      jobTitle: job?.title,
      companyName: job?.companyId?.name || "the company",
      interview,
    }),
  });
};

const notifyRecruiter = async (interview, candidateName, kind) => {
  const [job, recruiter] = await Promise.all([
    jobAndCompany(interview.jobId),
    User.findById(interview.recruiterId).select("email").lean(),
  ]);
  if (!recruiter) return;
  await sendEmailSafe({
    to: recruiter.email,
    ...interviewResponseEmail(candidateName, job?.title, kind, interview),
  });
};

// ---------- Recruiter ----------

export const scheduleInterview = asyncHandler(async (req, res) => {
  // Ownership runs through the job, exactly like the other applicant actions
  const application = await Application.findById(req.params.id);
  const job = application
    ? await Job.findOne({ _id: application.jobId, recruiterId: req.user._id }).select("_id")
    : null;
  if (!job) throw new ApiError(404, "Application not found");

  if (application.stage !== "interview") {
    throw new ApiError(409, "Interviews can only be scheduled while the application is in the interview stage");
  }

  const interview = new Interview({
    ...pickFields(req.body),
    applicationId: application._id,
    jobId: application.jobId,
    candidateId: application.candidateId,
    recruiterId: req.user._id,
  });
  checkRules(interview);

  try {
    await interview.save();
  } catch (err) {
    // The partial unique index allows only one open interview per application
    if (err.code === 11000) {
      throw new ApiError(409, "This application already has an open interview. Complete or cancel it first.");
    }
    throw err;
  }

  await notifyCandidate(interview, "scheduled");
  await writeAudit(req, "Application", "INTERVIEW_SCHEDULED", application._id, { interviewId: interview._id });
  res.status(201).json({ interview: interviewView(interview.toObject()) });
});

export const updateInterview = asyncHandler(async (req, res) => {
  const interview = await Interview.findOne({ _id: req.params.id, recruiterId: req.user._id });
  if (!interview) throw new ApiError(404, "Interview not found");
  if (!interview.open) throw new ApiError(409, `A ${interview.status} interview cannot be changed`);

  interview.set(pickFields(req.body));
  checkRules(interview);
  if (!interview.isModified()) throw new ApiError(400, "Nothing to update");

  // A new time starts the confirmation over
  if (interview.isModified("scheduledAt")) {
    interview.status = "scheduled";
    interview.rescheduleReason = undefined;
  }

  await interview.save();
  await notifyCandidate(interview, "updated");
  res.json({ interview: interviewView(interview.toObject()) });
});

export const cancelInterview = asyncHandler(async (req, res) => {
  const interview = await Interview.findOneAndUpdate(
    { _id: req.params.id, recruiterId: req.user._id, open: true },
    { $set: { status: "cancelled", open: false } },
    { new: true }
  );

  if (!interview) {
    const exists = await Interview.exists({ _id: req.params.id, recruiterId: req.user._id });
    throw new ApiError(exists ? 409 : 404, exists ? "This interview is no longer open" : "Interview not found");
  }

  await notifyCandidate(interview, "cancelled");
  await writeAudit(req, "Application", "INTERVIEW_CANCELLED", interview.applicationId, { interviewId: interview._id });
  res.json({ interview: interviewView(interview.toObject()) });
});

export const completeInterview = asyncHandler(async (req, res) => {
  const interview = await Interview.findOneAndUpdate(
    { _id: req.params.id, recruiterId: req.user._id, open: true, scheduledAt: { $lte: new Date() } },
    { $set: { status: "completed", open: false } },
    { new: true }
  );

  if (!interview) {
    const row = await Interview.findOne({ _id: req.params.id, recruiterId: req.user._id }).select("open").lean();
    if (!row) throw new ApiError(404, "Interview not found");
    throw new ApiError(409, row.open ? "This interview has not taken place yet" : "This interview is no longer open");
  }
  res.json({ interview: interviewView(interview.toObject()) });
});

const candidateAction = async (req, allowedStatuses, update) => {
  const interview = await Interview.findOneAndUpdate(
    {
      _id: req.params.id,
      candidateId: req.user._id,
      status: { $in: allowedStatuses },
      scheduledAt: { $gt: new Date() },
    },
    { $set: update },
    { new: true }
  );

  if (!interview) {
    const row = await Interview.findOne({ _id: req.params.id, candidateId: req.user._id })
      .select("open scheduledAt")
      .lean();
    if (!row) throw new ApiError(404, "Interview not found");
    throw new ApiError(
      409,
      row.open && row.scheduledAt <= new Date()
        ? "This interview time has already passed"
        : "This interview cannot be changed in its current state"
    );
  }
  return interview;
};

export const confirmInterview = asyncHandler(async (req, res) => {
  const interview = await candidateAction(req, ["scheduled"], { status: "confirmed" });
  await notifyRecruiter(interview, req.user.name, "confirmed");
  res.json({ interview: interviewView(interview.toObject()) });
});

export const requestReschedule = asyncHandler(async (req, res) => {
  const interview = await candidateAction(req, ["scheduled", "confirmed"], {
    status: "reschedule_requested",
    rescheduleReason: req.body.reason,
  });
  await notifyRecruiter(interview, req.user.name, "reschedule_requested");
  res.json({ interview: interviewView(interview.toObject()) });
});


export const listInterviews = asyncHandler(async (req, res) => {
  const isRecruiter = req.user.role === "recruiter";
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  const upcoming = req.query.upcoming === "true";

  const filter = isRecruiter ? { recruiterId: req.user._id } : { candidateId: req.user._id };
  if (req.query.status) filter.status = req.query.status;
  if (upcoming) {
    filter.open = true;
    filter.scheduledAt = { $gte: new Date() };
  }

  const query = Interview.find(filter)
    .sort(upcoming ? { scheduledAt: 1, _id: 1 } : { scheduledAt: -1, _id: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate({ path: "jobId", select: "title companyId", populate: { path: "companyId", select: "name" } });
  if (isRecruiter) query.populate("candidateId", "name email");

  const [rows, total] = await Promise.all([query.lean(), Interview.countDocuments(filter)]);

  const items = rows.map((i) => ({
    ...interviewView(i),
    job: { id: i.jobId?._id, title: i.jobId?.title, company: i.jobId?.companyId?.name },
    ...(isRecruiter && i.candidateId && {
      candidate: { id: i.candidateId._id, name: i.candidateId.name, email: i.candidateId.email },
    }),
  }));

  res.json({ items, page, limit, total, pages: Math.ceil(total / limit) });
});