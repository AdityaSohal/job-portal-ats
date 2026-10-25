import JobAlert from "../models/JobAlert.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

const MAX_ALERTS = 5;

const cleanFilters = (f = {}) => {
  const out = {};
  if (f.q) out.q = f.q;
  if (f.location) out.location = f.location;
  if (f.workMode?.length) out.workMode = [...new Set(f.workMode)];
  if (f.employmentType?.length) out.employmentType = [...new Set(f.employmentType)];
  if (f.exp !== undefined && f.exp !== null) out.exp = Number(f.exp);
  if (f.ctc !== undefined && f.ctc !== null) out.ctc = Number(f.ctc);
  if (f.skills?.length) {
    out.skills = [...new Set(f.skills.map((s) => s.trim().toLowerCase()).filter(Boolean))].slice(0, 10);
  }
  return out;
};

const toClient = (alert) => {
  const obj = alert.toObject();
  delete obj.__v;
  delete obj.userId;
  return obj;
};

export const createAlert = asyncHandler(async (req, res) => {
  const filters = cleanFilters(req.body.filters);
  if (!Object.keys(filters).length) throw new ApiError(400, "Add at least one filter to the alert");

  if ((await JobAlert.countDocuments({ userId: req.user._id })) >= MAX_ALERTS) {
    throw new ApiError(409, `You can have up to ${MAX_ALERTS} job alerts. Delete one first.`);
  }

  const alert = await JobAlert.create({
    userId: req.user._id,
    name: req.body.name || undefined,
    frequency: req.body.frequency || undefined,
    filters,
  });
  res.status(201).json({ alert: toClient(alert) });
});

export const listAlerts = asyncHandler(async (req, res) => {
  const items = await JobAlert.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .select("-__v -userId")
    .lean();
  res.json({ items });
});

export const updateAlert = asyncHandler(async (req, res) => {
  // Ownership is part of the query: someone else's alert is simply "not found"
  const alert = await JobAlert.findOne({ _id: req.params.id, userId: req.user._id });
  if (!alert) throw new ApiError(404, "Alert not found");

  const { name, frequency, isActive } = req.body;
  if (name !== undefined) alert.name = name;
  if (frequency !== undefined) alert.frequency = frequency;
  if (isActive !== undefined) {
    if (isActive && !alert.isActive) alert.lastSentAt = new Date();
    alert.isActive = isActive;
  }

  await alert.save();
  res.json({ alert: toClient(alert) });
});

export const deleteAlert = asyncHandler(async (req, res) => {
  const { deletedCount } = await JobAlert.deleteOne({ _id: req.params.id, userId: req.user._id });
  if (!deletedCount) throw new ApiError(404, "Alert not found");
  res.json({ message: "Alert deleted" });
});