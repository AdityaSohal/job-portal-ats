import mongoose from "mongoose";
import { APPLICATION_STAGES } from "../utils/constants.js";

const stageHistorySchema = new mongoose.Schema({
  from: { type: String, enum: APPLICATION_STAGES },
  to: { type: String, enum: APPLICATION_STAGES, required: true },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  at: { type: Date, default: Date.now },
  note: { type: String, maxlength: 500 },
});

const noteSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true, maxlength: 1000 },
  createdAt: { type: Date, default: Date.now },
});

const applicationSchema = new mongoose.Schema(
  {
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    resumeKey: { type: String, required: true },
    resumeName: { type: String, required: true },

    coverNote: { type: String, maxlength: 2000 },
    stage: { type: String, enum: APPLICATION_STAGES, default: "applied" },
    stageHistory: [stageHistorySchema],
    recruiterNotes: [noteSchema],
    matchScore: { type: Number, min: 0, max: 100, default: 0 },
  },
  { timestamps: true }
);

applicationSchema.index({ jobId: 1, candidateId: 1 }, { unique: true });
applicationSchema.index({ candidateId: 1, createdAt: -1 });
applicationSchema.index({ jobId: 1, stage: 1, matchScore: -1 });

export default mongoose.model("Application", applicationSchema);