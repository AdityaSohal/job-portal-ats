import Application from "../models/Application.js";
import Job from "../models/Job.js";
import Company from "../models/Company.js";
import User from "../models/User.js";
import CandidateProfile from "../models/CandidateProfile.js";
import AuditLog from "../models/AuditLog.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { skillBreakdown } from "../utils/matchScore.js";
import { allowedFor, moveStage } from "../utils/applicationStateMachine.js";
import { sendEmailSafe } from "../utils/sendEmail.js";
import { applicationReceivedEmail, stageChangeEmail } from "../utils/emailTemplates.js";
import { signedDownloadUrl, SIGNED_URL_TTL_SECONDS } from "../utils/cloudinary.js";
import { visibleNow } from "./publicJobController.js";

const JOB_POPULATE = {
  path: "jobId",
  select: "title location workMode status companyId",
  populate: { path: "companyId", select: "name logoUrl" },
};

const candidateView = (a, withHistory = false) => ({
  id: a._id,
  jobId: a.jobId?._id || a.jobId,
  job: a.jobId?.title
    ? {
        title: a.jobId.title,
        location: a.jobId.location,
        workMode: a.jobId.workMode,
        status: a.jobId.status,
        company: a.jobId.companyId,
      }
    : undefined,
  stage: a.stage,
  resumeName: a.resumeName,
  coverNote: a.coverNote,
  createdAt: a.createdAt,
  updatedAt: a.updatedAt,
  ...(withHistory && { history: a.stageHistory.map(({ from, to, at }) => ({ from, to, at })) }),
});

const audit = (req, action, targetId, meta) => writeAudit(req, "Application", action, targetId, meta);


export const applyToJob = asyncHandler(async (req, res) => {
  const { jobId, resumeId, coverNote } = req.body;

  const [job, profile] = await Promise.all([
    Job.findOne({ _id: jobId, ...visibleNow() }).select("title skills companyId"),
    CandidateProfile.findOne({ userId: req.user._id }),
  ]);
  if (!(await Company.exists({ _id: job.companyId, status: "approved" }))) {
    throw new ApiError(404, "Job not found or no longer accepting applications");
  }

  const resume = profile?.resumes.id(resumeId);
  if (!resume) throw new ApiError(404, "Resume not found. Upload a resume to your profile first.");

  const { score } = skillBreakdown(profile.skills, job.skills);

  let application;
  try {
    application = await Application.create({
      jobId: job._id,
      candidateId: req.user._id,
      resumeKey: resume.key, 
      resumeName: resume.name,
      coverNote,
      matchScore: score,
      stageHistory: [{ to: "applied", changedBy: req.user._id }],
    });
  } catch (err) {
    if (err.code === 11000) {
      const existing = await Application.findOne({ jobId: job._id, candidateId: req.user._id }).select("stage");
      throw new ApiError(
        409,
        existing?.stage === "withdrawn"
          ? "You withdrew your application for this job and cannot apply again"
          : "You have already applied to this job"
      );
    }
    throw err;
  }

  const company = await Company.findById(job.companyId).select("name");
  await sendEmailSafe({
    to: req.user.email,
    ...applicationReceivedEmail(job.title, company?.name || "the company"),
  });

  res.status(201).json({ application: candidateView(application.toObject(), true) });
});

export const listMyApplications = asyncHandler(async (req, res) => {
  const { stage } = req.query;
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);

  const filter = { candidateId: req.user._id };
  if (stage) filter.stage = stage;

  const [items, total] = await Promise.all([
    Application.find(filter)
      .select("-recruiterNotes -resumeKey -matchScore -stageHistory")
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(JOB_POPULATE)
      .lean(),
    Application.countDocuments(filter),
  ]);

  res.json({ items: items.map((a) => candidateView(a)), page, limit, total, pages: Math.ceil(total / limit) });
});

export const getMyApplication = asyncHandler(async (req, res) => {
  const application = await Application.findOne({ _id: req.params.id, candidateId: req.user._id })
    .select("-recruiterNotes -resumeKey -matchScore")
    .populate(JOB_POPULATE)
    .lean();
  if (!application) throw new ApiError(404, "Application not found");

  res.json({ application: candidateView(application, true) });
});

export const withdrawApplication = asyncHandler(async (req, res) => {
  const application = await Application.findOne({ _id: req.params.id, candidateId: req.user._id });
  if (!application) throw new ApiError(404, "Application not found");

  if (!allowedFor(application.stage, "candidate").includes("withdrawn")) {
    throw new ApiError(409, `A ${application.stage} application can no longer be withdrawn`);
  }

  const updated = await moveStage(application, "withdrawn", req.user._id);
  res.json({ application: candidateView(updated.toObject(), true) });
});

const loadOwned = async (req) => {
  const application = await Application.findById(req.params.id);
  const job = application
    ? await Job.findOne({ _id: application.jobId, recruiterId: req.user._id }).select("title skills companyId")
    : null;
  if (!job) throw new ApiError(404, "Application not found");
  return { application, job };
};

export const listApplicants = asyncHandler(async (req, res) => {
  const job = await Job.findOne({ _id: req.params.id, recruiterId: req.user._id }).select("title");
  if (!job) throw new ApiError(404, "Job not found");

  const { stage, sort = "match" } = req.query;
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);

  const filter = { jobId: job._id };
  if (stage) filter.stage = stage;

  const sortSpec =
    sort === "latest"
      ? { createdAt: -1, _id: -1 }
      : { matchScore: -1, createdAt: 1, _id: 1 }; 

  const [apps, total, counts] = await Promise.all([
    Application.find(filter)
      .select("-recruiterNotes -stageHistory -resumeKey")
      .sort(sortSpec)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("candidateId", "name email avatarUrl")
      .lean(),
    Application.countDocuments(filter),
    Application.aggregate([
      { $match: { jobId: job._id } },
      { $group: { _id: "$stage", count: { $sum: 1 } } },
    ]),
  ]);

  const ids = apps.map((a) => a.candidateId?._id).filter(Boolean);
  const profiles = await CandidateProfile.find(
    { userId: { $in: ids } },
    "userId headline location phone skills experienceYears expectedCtc links"
  ).lean();
  const profileMap = new Map(profiles.map((p) => [p.userId.toString(), p]));

  const items = apps.map((a) => {
    const user = a.candidateId;
    const p = profileMap.get(user?._id.toString()) || {};
    return {
      id: a._id,
      stage: a.stage,
      matchScore: a.matchScore,
      coverNote: a.coverNote,
      resumeName: a.resumeName,
      appliedAt: a.createdAt,
      candidate: {
        id: user?._id,
        name: user?.name,
        email: user?.email,
        avatarUrl: user?.avatarUrl,
        headline: p.headline,
        location: p.location,
        phone: p.phone,
        skills: p.skills || [],
        experienceYears: p.experienceYears,
        expectedCtc: p.expectedCtc,
        links: p.links,
      },
    };
  });

  res.json({
    job: { id: job._id, title: job.title },
    items,
    stageCounts: Object.fromEntries(counts.map((c) => [c._id, c.count])),
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  });
});

export const getApplication = asyncHandler(async (req, res) => {
  const { application, job } = await loadOwned(req);

  await application.populate([
    { path: "stageHistory.changedBy", select: "name role" },
    { path: "recruiterNotes.author", select: "name" },
  ]);

  const [user, profile] = await Promise.all([
    User.findById(application.candidateId).select("name email avatarUrl"),
    CandidateProfile.findOne({ userId: application.candidateId }).select("-resumes -userId -__v"),
  ]);

  const { matched, missing } = skillBreakdown(profile?.skills, job.skills);

  const obj = application.toObject();
  delete obj.resumeKey; 
  delete obj.__v;

  res.json({
    application: obj,
    job: { id: job._id, title: job.title },
    candidate: { user, profile },
    skills: { matched, missing },
    allowedNextStages: allowedFor(application.stage, "recruiter"),
  });
});

export const changeStage = asyncHandler(async (req, res) => {
  const { stage: to, note } = req.body;
  const { application, job } = await loadOwned(req);

  const allowed = allowedFor(application.stage, "recruiter");
  if (!allowed.includes(to)) {
    throw new ApiError(
      409,
      `Cannot move an application from "${application.stage}" to "${to}". Allowed: ${allowed.join(", ") || "none (final stage)"}`
    );
  }

  const updated = await moveStage(application, to, req.user._id, note);
  await audit(req, "STAGE_CHANGED", application._id, { from: application.stage, to });

  const [candidate, company] = await Promise.all([
    User.findById(application.candidateId).select("email"),
    Company.findById(job.companyId).select("name"),
  ]);
  if (candidate) {
    await sendEmailSafe({
      to: candidate.email,
      ...stageChangeEmail(job.title, company?.name || "the company", to),
    });
  }

  res.json({
    application: { id: updated._id, stage: updated.stage, stageHistory: updated.stageHistory },
    allowedNextStages: allowedFor(updated.stage, "recruiter"),
  });
});

export const addNote = asyncHandler(async (req, res) => {
  const { application } = await loadOwned(req);

  if (application.recruiterNotes.length >= 50) {
    throw new ApiError(409, "This application has reached the limit of 50 notes");
  }

  application.recruiterNotes.push({ author: req.user._id, text: req.body.text });
  await application.save();

  const note = application.recruiterNotes.at(-1);
  res.status(201).json({
    note: {
      id: note._id,
      text: note.text,
      createdAt: note.createdAt,
      author: { id: req.user._id, name: req.user.name },
    },
  });
});

export const downloadApplicantResume = asyncHandler(async (req, res) => {
  const { application } = await loadOwned(req);

  await audit(req, "RESUME_DOWNLOADED", application._id, { resumeName: application.resumeName });

  res.set("Cache-Control", "no-store");
  res.json({
    url: signedDownloadUrl(application.resumeKey),
    expiresInSeconds: SIGNED_URL_TTL_SECONDS,
  });
});