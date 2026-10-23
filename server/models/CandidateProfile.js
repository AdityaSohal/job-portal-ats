import mongoose from "mongoose";
import { WORK_MODES } from "../utils/constants.js";
import { computeCompletion } from "../utils/profileCompletion.js";

const educationSchema = new mongoose.Schema({
  institution: { type: String, required: true, trim: true },
  degree: { type: String, trim: true },
  fieldOfStudy: { type: String, trim: true },
  startYear: Number,
  endYear: Number,
  grade: String,
});

const experienceSchema = new mongoose.Schema({
  company: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true },
  startDate: Date,
  endDate: Date, 
  description: { type: String, maxlength: 1500 },
});

const resumeSchema = new mongoose.Schema({
  key: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true }, // bytes
  uploadedAt: { type: Date, default: Date.now },
});

const candidateProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    headline: { type: String, trim: true, maxlength: 120 },
    summary: { type: String, maxlength: 2000 },
    location: { type: String, trim: true },
    phone: { type: String, trim: true },
    skills: [{ type: String, trim: true, lowercase: true }],
    experienceYears: { type: Number, min: 0, max: 60, default: 0 },
    expectedCtc: { type: Number, min: 0 }, // in LPA
    preferredWorkMode: { type: String, enum: WORK_MODES },
    education: [educationSchema],
    experience: [experienceSchema],
    resumes: [resumeSchema],
    links: {
      portfolio: String,
      github: String,
      linkedin: String,
    },
    profileCompletion: { type: Number, min: 0, max: 100, default: 0 },
  },
  { timestamps: true }
);

candidateProfileSchema.index({ skills: 1 });
candidateProfileSchema.pre("save", function () {
  this.profileCompletion = computeCompletion(this);
});

export default mongoose.model("CandidateProfile", candidateProfileSchema);