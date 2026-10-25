import Application from "../models/Application.js";
import ApiError from "./ApiError.js";
import { STAGE_TRANSITIONS } from "./constants.js";

export const RECRUITER_TARGETS = ["shortlisted", "interview", "offered", "rejected"];

export const allowedFor = (from, actor) =>
  (STAGE_TRANSITIONS[from] || []).filter((to) =>
    actor === "candidate" ? to === "withdrawn" : to !== "withdrawn"
  );

export const moveStage = async (application, to, userId, note) => {
  const entry = { from: application.stage, to, changedBy: userId, at: new Date() };
  if (note) entry.note = note;

  const updated = await Application.findOneAndUpdate(
    { _id: application._id, stage: application.stage },
    { $set: { stage: to }, $push: { stageHistory: entry } },
    { new: true }
  );

  if (!updated) {
    throw new ApiError(409, "This application was just updated by someone else. Please refresh.");
  }
  return updated;
};