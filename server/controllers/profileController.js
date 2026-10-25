import crypto from "crypto";
import path from "path";
import CandidateProfile from "../models/CandidateProfile.js";
import Application from "../models/Application.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { completionBreakdown } from "../utils/profileCompletion.js";
import { uploadPrivate, deletePrivate, signedDownloadUrl, SIGNED_URL_TTL_SECONDS } from "../utils/cloudinary.js";
import { normalizeSkills } from "../utils/skills.js";
import { recomputeForCandidate } from "../utils/matchRecompute.js";

const MAX_RESUMES = 3;
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const getProfile = async (userId) =>
  (await CandidateProfile.findOne({ userId })) || (await CandidateProfile.create({ userId }));

const toClient = (profile) => {
  const obj = profile.toObject();
  delete obj.__v;
  obj.resumes = profile.resumes.map((r) => ({
    id: r._id, name: r.name, mimeType: r.mimeType, size: r.size, uploadedAt: r.uploadedAt,
  }));
  return obj;
};

const respond = (res, profile, status = 200) =>
  res.status(status).json({ profile: toClient(profile), completion: completionBreakdown(profile) });

const SCALARS = ["headline", "summary", "location", "phone", "experienceYears", "expectedCtc", "preferredWorkMode"];

export const getMyProfile = asyncHandler(async (req, res) => {
  respond(res, await getProfile(req.user._id));
});

export const updateMyProfile = asyncHandler(async (req, res) => {
  const b = req.body;

  for (const e of b.education || []) {
    if (e.startYear && e.endYear && e.endYear < e.startYear) {
      throw new ApiError(400, "Education end year cannot be before the start year");
    }
  }
  for (const x of b.experience || []) {
    if (x.startDate && x.endDate && new Date(x.endDate) < new Date(x.startDate)) {
      throw new ApiError(400, "Experience end date cannot be before the start date");
    }
  }

  const profile = await getProfile(req.user._id);

  for (const key of SCALARS) {
    if (b[key] !== undefined) profile[key] = b[key] === "" || b[key] === null ? undefined : b[key];
  }

  const skillsBefore = [...profile.skills];
  if (b.skills) profile.skills = normalizeSkills(b.skills);
  const skillsChanged =
    skillsBefore.length !== profile.skills.length || skillsBefore.some((s) => !profile.skills.includes(s));

  if (b.education) {
    profile.education = b.education.map((e) => ({
      institution: e.institution, degree: e.degree, fieldOfStudy: e.fieldOfStudy,
      startYear: e.startYear, endYear: e.endYear, grade: e.grade,
    }));
  }
  if (b.experience) {
    profile.experience = b.experience.map((x) => ({
      company: x.company, title: x.title, startDate: x.startDate || undefined,
      endDate: x.endDate || undefined, description: x.description,
    }));
  }
  for (const k of ["portfolio", "github", "linkedin"]) {
    if (b.links?.[k] !== undefined) profile.set(`links.${k}`, b.links[k]);
  }

  await profile.save();
  if (skillsChanged) await recomputeForCandidate(req.user._id, profile.skills);

  if (b.name !== undefined) {
    req.user.name = b.name;
    await req.user.save();
  }

  respond(res, profile);
});


const hasBytes = (buf, bytes) => bytes.every((b, i) => buf[i] === b);

const detectKind = (buffer, ext) => {
  const isPdf = hasBytes(buffer, [0x25, 0x50, 0x44, 0x46, 0x2d]); // "%PDF-"
  const isDocx =
    hasBytes(buffer, [0x50, 0x4b, 0x03, 0x04]) && 
    buffer.includes(Buffer.from("word/document.xml"));
  if (ext === ".pdf" && isPdf) return { ext: ".pdf", mimeType: "application/pdf" };
  if (ext === ".docx" && isDocx) return { ext: ".docx", mimeType: DOCX_MIME };
  return null;
};

const cleanFileName = (original) =>
  path.basename(original).replace(/[^\w.\- ()]/g, "_").slice(0, 80) || "resume";

export const uploadResume = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "Attach a PDF or DOCX file in the 'resume' field");

  const ext = path.extname(req.file.originalname).toLowerCase();
  const kind = detectKind(req.file.buffer, ext);
  if (!kind) throw new ApiError(400, "The file content does not match a valid PDF or DOCX");

  const profile = await getProfile(req.user._id);
  if (profile.resumes.length >= MAX_RESUMES) {
    throw new ApiError(409, `You can keep up to ${MAX_RESUMES} resumes. Delete one first.`);
  }

  const key = `resumes/${req.user._id}/${crypto.randomBytes(16).toString("hex")}${kind.ext}`;
  await uploadPrivate(req.file.buffer, key);

  try {
    profile.resumes.push({
      key, name: cleanFileName(req.file.originalname), mimeType: kind.mimeType, size: req.file.size,
    });
    await profile.save();
  } catch (err) {
    await deletePrivate(key); 
    throw err;
  }

  respond(res, profile, 201);
});

export const renameResume = asyncHandler(async (req, res) => {
  const profile = await getProfile(req.user._id);
  const resume = profile.resumes.id(req.params.resumeId);
  if (!resume) throw new ApiError(404, "Resume not found");

  resume.name = req.body.name;
  await profile.save();
  respond(res, profile);
});

export const deleteResume = asyncHandler(async (req, res) => {
  const profile = await getProfile(req.user._id);
  const resume = profile.resumes.id(req.params.resumeId);
  if (!resume) throw new ApiError(404, "Resume not found");

  const key = resume.key;
  resume.deleteOne();
  await profile.save();
  const stillInUse = await Application.exists({ candidateId: req.user._id, resumeKey: key });
  if (!stillInUse) await deletePrivate(key);

  respond(res, profile);
});

export const downloadResume = asyncHandler(async (req, res) => {
  const profile = await getProfile(req.user._id);
  const resume = profile.resumes.id(req.params.resumeId);
  if (!resume) throw new ApiError(404, "Resume not found");

  res.set("Cache-Control", "no-store");
  res.json({ url: signedDownloadUrl(resume.key), expiresInSeconds: SIGNED_URL_TTL_SECONDS });
});