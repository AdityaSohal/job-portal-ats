import mongoose from "mongoose";

export const runInTransaction = async (work) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(() => work(session));
  } finally {
    await session.endSession();
  }
};