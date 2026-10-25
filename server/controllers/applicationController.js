import Application from "../models/Application.js";
import Job from "../models/Job.js";
import Company from "../models/Company.js";
import User from "../models/User.js";
import CandidateProfile from "../models/CandidateProfile.js";
import Interview from "../models/Interview.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { skillBreakdown } from "../utils/matchScore.js";
import { normalizeSkills } from "../utils/skills.js";
import { allowedFor, moveStage } from "../utils/applicationStateMachine.js";
import { closeOpenInterviews, interviewView } from "../utils/interviews.js";
import { toCsv } from "../utils/csv.js";
import { writeAudit } from "../utils/audit.js";
import { sendEmailSafe } from "../utils/sendEmail.js";
import { applicationReceivedEmail, stageChangeEmail } from "../utils/emailTemplates.js";
import { rejectionEmail, offerResponseEmail } from "../utils/emailTemplatesAts.js";
import { signedDownloadUrl, SIGNED_URL_TTL_SECONDS } from "../utils/cloudinary.js";
import { visibleNow } from "./publicJobController.js";

const MAX_EXPORT = 5000;
const OPEN_JOB_STATUSES = ["pending", "active", "suspended"];

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const csv = (v) => String(v).split(",").map((s) => s.trim()).filter(Boolean);

const JOB_POPULATE = {
  path: "jobId",
  select: "title location workMode status companyId",
  populate: { path: "companyId", select: "name logoUrl" },
};

const audit = (req, action, targetId, meta) => writeAudit(req, "Application", action, targetId, meta);

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
  ...(withHistory && {
    history: a.stageHistory.map(({ from, to, at, feedback }) => ({ from, to, at, ...(feedback && { feedback }) })),
  }),
});


export const applyToJob = asyncHandler(async (req, res) => {
  const { jobId, resumeId, coverNote } = req.body;

  const [job, profile] = await Promise.all([
    Job.findOne({ _id: jobId, ...visibleNow() }).select("title skills companyId"),
    CandidateProfile.findOne({ userId: req.user._id }),
  ]);
  if (!job) throw new ApiError(404, "Job not found or no longer accepting applications");

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

  const interviews = await Interview.find({ applicationId: application._id }).sort({ scheduledAt: -1 }).lean();

  res.json({
    application: {
      ...candidateView(application, true),
      allowedNextStages: allowedFor(application.stage, "candidate"),
      interviews: interviews.map(interviewView),
    },
  });
});

export const withdrawApplication = asyncHandler(async (req, res) => {
  const application = await Application.findOne({ _id: req.params.id, candidateId: req.user._id });
  if (!application) throw new ApiError(404, "Application not found");

  if (!allowedFor(application.stage, "candidate").includes("withdrawn")) {
    throw new ApiError(409, `An application in the "${application.stage}" stage can no longer be withdrawn`);
  }

  const updated = await moveStage(application, "withdrawn", req.user._id);
  await closeOpenInterviews(application._id, "cancelled");
  res.json({ application: candidateView(updated.toObject(), true) });
});

export const respondToOffer = asyncHandler(async (req, res) => {
  const application = await Application.findOne({ _id: req.params.id, candidateId: req.user._id });
  if (!application) throw new ApiError(404, "Application not found");
  if (application.stage !== "offered") throw new ApiError(409, "There is no open offer on this application");

  const accepting = req.body.decision === "accept";
  const to = accepting ? "hired" : "declined";


  let reserved = null;
  if (accepting) {
    reserved = await Job.findOneAndUpdate(
      {
        _id: application.jobId,
        $expr: { $lt: [{ $ifNull: ["$hiredCount", 0] }, { $ifNull: ["$openings", 1] }] },
      },
      { $inc: { hiredCount: 1 } },
      { new: true }
    );
    if (!reserved) throw new ApiError(409, "This position has already been filled");
  }

  let updated;
  try {
    updated = await moveStage(application, to, req.user._id);
  } catch (err) {
    if (reserved) await Job.updateOne({ _id: reserved._id }, { $inc: { hiredCount: -1 } }); 
    throw err;
  }

  const filled = !!reserved && reserved.hiredCount >= (reserved.openings ?? 1);
  if (filled) {
    await Job.updateOne(
      { _id: reserved._id, status: { $in: OPEN_JOB_STATUSES } },
      { $set: { status: "closed" } }
    );
  }

  const job = await Job.findById(application.jobId).select("title recruiterId");
  const recruiter = job ? await User.findById(job.recruiterId).select("email") : null;
  if (recruiter) {
    await sendEmailSafe({
      to: recruiter.email,
      ...offerResponseEmail(req.user.name, job.title, accepting, filled),
    });
  }

  res.json({ application: candidateView(updated.toObject(), true), jobFilled: filled });
});


const ownedJob = async (req) => {
  const job = await Job.findOne({ _id: req.params.id, recruiterId: req.user._id }).select("title");
  if (!job) throw new ApiError(404, "Job not found");
  return job;
};

const loadOwned = async (req) => {
  const application = await Application.findById(req.params.id);
  const job = application
    ? await Job.findOne({ _id: application.jobId, recruiterId: req.user._id }).select("title skills companyId")
    : null;
  if (!job) throw new ApiError(404, "Application not found");
  return { application, job };
};

const buildApplicantFilter = async (job, query) => {
  const filter = { jobId: job._id };
  if (query.stage) filter.stage = query.stage;
  if (query.minMatch !== undefined && query.minMatch !== "") filter.matchScore = { $gte: Number(query.minMatch) };

  const q = query.q?.trim();
  const skills = query.skills ? normalizeSkills(csv(query.skills), 10) : [];
  const hasExp = query.exp !== undefined && query.exp !== "";

  if (q || skills.length || hasExp) {
    let ids = await Application.distinct("candidateId", { jobId: job._id });

    if (q) {
      const re = escapeRegex(q);
      const users = await User.find({
        _id: { $in: ids },
        $or: [{ name: { $regex: re, $options: "i" } }, { email: { $regex: re, $options: "i" } }],
      })
        .select("_id")
        .lean();
      ids = users.map((u) => u._id);
    }

    if ((skills.length || hasExp) && ids.length) {
      const profileFilter = { userId: { $in: ids } };
      if (skills.length) profileFilter.skills = { $all: skills };
      if (hasExp) profileFilter.experienceYears = { $gte: Number(query.exp) };
      const profiles = await CandidateProfile.find(profileFilter).select("userId").lean();
      ids = profiles.map((p) => p.userId);
    }

    filter.candidateId = { $in: ids };
  }
  return filter;
};

const attachCandidates = async (apps) => {
  const ids = apps.map((a) => a.candidateId).filter(Boolean);
  const [users, profiles] = await Promise.all([
    User.find({ _id: { $in: ids } }).select("name email avatarUrl").lean(),
    CandidateProfile.find(
      { userId: { $in: ids } },
      "userId headline location phone skills experienceYears expectedCtc links"
    ).lean(),
  ]);
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));
  const profileMap = new Map(profiles.map((p) => [p.userId.toString(), p]));
  return apps.map((app) => ({
    app,
    user: userMap.get(app.candidateId.toString()),
    profile: profileMap.get(app.candidateId.toString()) || {},
  }));
};

export const listApplicants = asyncHandler(async (req, res) => {
  const job = await ownedJob(req);

  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  const sortSpec =
    req.query.sort === "latest"
      ? { createdAt: -1, _id: -1 }
      : { matchScore: -1, createdAt: 1, _id: 1 }; 

  const filter = await buildApplicantFilter(job, req.query);

  const [apps, total, counts] = await Promise.all([
    Application.find(filter)
      .select("-recruiterNotes -stageHistory -resumeKey")
      .sort(sortSpec)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Application.countDocuments(filter),
    Application.aggregate([
      { $match: { jobId: job._id } },
      { $group: { _id: "$stage", count: { $sum: 1 } } },
    ]),
  ]);

  const rows = await attachCandidates(apps);
  const items = rows.map(({ app, user, profile }) => ({
    id: app._id,
    stage: app.stage,
    matchScore: app.matchScore,
    coverNote: app.coverNote,
    resumeName: app.resumeName,
    appliedAt: app.createdAt,
    candidate: {
      id: user?._id,
      name: user?.name,
      email: user?.email,
      avatarUrl: user?.avatarUrl,
      headline: profile.headline,
      location: profile.location,
      phone: profile.phone,
      skills: profile.skills || [],
      experienceYears: profile.experienceYears,
      expectedCtc: profile.expectedCtc,
      links: profile.links,
    },
  }));

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

const EXPORT_HEADERS = [
  "Name", "Email", "Phone", "Stage", "Match score", "Experience (years)",
  "Expected CTC (LPA)", "Skills", "Applied at", "Resume",
];

export const exportApplicants = asyncHandler(async (req, res) => {
  const job = await ownedJob(req);
  const filter = await buildApplicantFilter(job, req.query);

  const apps = await Application.find(filter)
    .select("stage matchScore resumeName createdAt candidateId")
    .sort({ matchScore: -1, createdAt: 1, _id: 1 })
    .limit(MAX_EXPORT)
    .lean();

  const rows = (await attachCandidates(apps)).map(({ app, user, profile }) => [
    user?.name,
    user?.email,
    profile.phone,
    app.stage,
    app.matchScore,
    profile.experienceYears,
    profile.expectedCtc,
    profile.skills,
    app.createdAt,
    app.resumeName,
  ]);

  await writeAudit(req, "Job", "APPLICANTS_EXPORTED", job._id, { count: rows.length });

  res.set({
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="applicants-${job._id}.csv"`,
    "Cache-Control": "no-store",
  });
  res.send("\uFEFF" + toCsv(EXPORT_HEADERS, rows)); 
});

export const getApplication = asyncHandler(async (req, res) => {
  const { application, job } = await loadOwned(req);

  await application.populate([
    { path: "stageHistory.changedBy", select: "name role" },
    { path: "recruiterNotes.author", select: "name" },
  ]);

  const [user, profile, interviews] = await Promise.all([
    User.findById(application.candidateId).select("name email avatarUrl"),
    CandidateProfile.findOne({ userId: application.candidateId }).select("-resumes -userId -__v"),
    Interview.find({ applicationId: application._id }).sort({ scheduledAt: -1 }).lean(),
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
    interviews: interviews.map(interviewView),
    allowedNextStages: allowedFor(application.stage, "recruiter"),
  });
});

export const changeStage = asyncHandler(async (req, res) => {
  const { stage: to, note, feedback } = req.body;
  if (feedback && to !== "rejected") {
    throw new ApiError(400, "Feedback can only be added when rejecting an application");
  }

  const { application, job } = await loadOwned(req);
  const from = application.stage;

  const allowed = allowedFor(from, "recruiter");
  if (!allowed.includes(to)) {
    throw new ApiError(
      409,
      `Cannot move an application from "${from}" to "${to}". Allowed: ${allowed.join(", ") || "none (final stage)"}`
    );
  }

  const updated = await moveStage(application, to, req.user._id, { note, feedback });

  if (from === "interview") await closeOpenInterviews(application._id, to === "offered" ? "completed" : "cancelled");

  await audit(req, "STAGE_CHANGED", application._id, { from, to });

  const [candidate, company] = await Promise.all([
    User.findById(application.candidateId).select("email"),
    Company.findById(job.companyId).select("name"),
  ]);
  if (candidate) {
    const companyName = company?.name || "the company";
    await sendEmailSafe({
      to: candidate.email,
      ...(to === "rejected"
        ? rejectionEmail(job.title, companyName, feedback)
        : stageChangeEmail(job.title, companyName, to)),
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