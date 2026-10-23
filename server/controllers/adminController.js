import Company from "../models/Company.js";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { sendEmail } from "../utils/sendEmail.js";
import { companyApprovedEmail, companyRejectedEmail } from "../utils/emailTemplates.js";

const audit = (req, action, targetId, meta) =>
  AuditLog.create({
    actorId: req.user._id,
    action,
    targetType: "Company",
    targetId,
    meta,
    ip: req.ip,
  });

const notifyOwner = async (company, template) => {
  try {
    const owner = await User.findById(company.createdBy).select("email");
    if (owner) await sendEmail({ to: owner.email, ...template });
  } catch (err) {
    console.error("Company email failed:", err.message);
  }
};

export const listCompanies = asyncHandler(async (req, res) => {
  const status = req.query.status || "pending";
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);

  const filter = status === "all" ? {} : { status };

  const [items, total] = await Promise.all([
    Company.find(filter)
      .sort({ createdAt: status === "pending" ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("createdBy", "name email createdAt"),
    Company.countDocuments(filter),
  ]);

  res.json({ items, page, limit, total, pages: Math.ceil(total / limit) });
});

export const approveCompany = asyncHandler(async (req, res) => {
  const company = await Company.findOneAndUpdate(
    { _id: req.params.id, status: { $in: ["pending", "rejected"] } },
    {
      status: "approved",
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
      $unset: { rejectionReason: "" },
    },
    { new: true }
  );

  if (!company) {
    const exists = await Company.exists({ _id: req.params.id });
    throw new ApiError(exists ? 409 : 404, exists ? "Company is already approved" : "Company not found");
  }

  await audit(req, "COMPANY_APPROVED", company._id, { name: company.name });
  await notifyOwner(company, companyApprovedEmail(company.name));
  res.json({ company });
});

export const rejectCompany = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const company = await Company.findOneAndUpdate(
    { _id: req.params.id, status: { $in: ["pending", "approved"] } },
    {
      status: "rejected",
      rejectionReason: reason,
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
    },
    { new: true }
  );

  if (!company) {
    const exists = await Company.exists({ _id: req.params.id });
    throw new ApiError(exists ? 409 : 404, exists ? "Company is already rejected" : "Company not found");
  }

  await audit(req, "COMPANY_REJECTED", company._id, { name: company.name, reason });
  await notifyOwner(company, companyRejectedEmail(company.name, reason));
  res.json({ company });
});