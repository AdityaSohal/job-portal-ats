import Company from "../models/Company.js";
import Job from "../models/Job.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

export const getMyCompany = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.user.companyId);
  if (!company) throw new ApiError(404, "Company not found");
  res.json({ company });
});

const EDITABLE = ["name", "website", "industry", "size", "location", "description", "logoUrl"];
const REVIEWED = ["name", "website", "description"];

export const updateMyCompany = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.user.companyId);
  if (!company) throw new ApiError(404, "Company not found");

  for (const key of EDITABLE) {
    if (req.body[key] !== undefined) company[key] = req.body[key];
  }

  const wasApproved = company.status === "approved";
  const needsReview = wasApproved && REVIEWED.some((key) => company.isModified(key));

  if (company.status === "rejected") {
    company.status = "pending"; 
    company.rejectionReason = undefined;
  } else if (needsReview) {
    company.status = "pending";
  }

  await company.save();

  let suspendedJobs = 0;
  if (needsReview) {
    const result = await Job.updateMany(
      { companyId: company._id, status: "active" },
      { $set: { status: "suspended" } }
    );
    suspendedJobs = result.modifiedCount;
  }

  res.json({ company, ...(needsReview && { reReview: true, suspendedJobs }) });
});