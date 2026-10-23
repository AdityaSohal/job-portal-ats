import mongoose from "mongoose";
import { WORK_MODES, EMPLOYMENT_TYPES, JOB_STATUS } from "../utils/constants.js";

const jobSchema = new mongoose.Schema(
  {
    recruiterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, maxlength: 8000 },
    skills: [{ type: String, trim: true, lowercase: true }],
    location: { type: String, required: true, trim: true },
    workMode: { type: String, enum: WORK_MODES, required: true },
    employmentType: { type: String, enum: EMPLOYMENT_TYPES, default: "full-time" },
    minExp: { type: Number, min: 0, default: 0 },
    maxExp: { type: Number, min: 0 },
    ctcRange: {
      min: { type: Number, min: 0 }, 
      max: { type: Number, min: 0 },
    },
    openings: { type: Number, min: 1, default: 1 },
    status: { type: String, enum: JOB_STATUS, default: "pending" }, // admin approves
    rejectionReason: { type: String },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    deadline: { type: Date },
  },
  { timestamps: true }
);

jobSchema.index({ status: 1, createdAt: 1 });
jobSchema.index({ status: 1, workMode: 1, location: 1, createdAt: -1, minExp: 1 });
jobSchema.index({ status: 1, skills: 1, createdAt: -1 });
jobSchema.index({ recruiterId: 1, status: 1, createdAt: -1 });
jobSchema.index({ status: 1, deadline: 1 });
jobSchema.index({ title: "text", description: "text" }, { weights: { title: 5, description: 1 } });

export default mongoose.model("Job", jobSchema);