import mongoose from "mongoose";
let cached = global._mongoose;
if (!cached) cached = global._mongoose = { conn: null, promise: null };
export const connectDB = async () => {
  if (cached.conn) return cached.conn;
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not set");
  }
  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGO_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
    });
  }
  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null; 
    throw err;
  }
  return cached.conn;
}