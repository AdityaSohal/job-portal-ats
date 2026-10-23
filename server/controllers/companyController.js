import Company from "../models/Company.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

export const getMyCompany = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.user.companyId);
  if (!company) throw new ApiError(404, "Company not found");
  res.json({ company });
});

const EDITABLE = ["name", "website", "industry", "size", "location", "description", "logoUrl"];

export const updateMyCompany = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.user.companyId);
  if (!company) throw new ApiError(404, "Company not found");

  for (const key of EDITABLE) {
    if (req.body[key] !== undefined) company[key] = req.body[key];
  }

  if (company.status === "rejected") {
    company.status = "pending";
    company.rejectionReason = undefined;
  }

  await company.save();
  res.json({ company });
});