import mongoose from "mongoose";
import { connectDB } from "../configs/db.js";

let indexReady;

export class MongoRateLimitStore {
  constructor(prefix) {
    this.prefix = prefix;
  }

  init(options) {
    this.windowMs = options.windowMs;
  }

  async collection() {
    await connectDB();
    const col = mongoose.connection.collection("ratelimits");
    indexReady ??= col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch((err) => {
      indexReady = undefined;
      console.error("Rate limit index failed:", err.message);
    });
    await indexReady;
    return col;
  }

  id(key) {
    return `${this.prefix}:${key}`;
  }

  async increment(key) {
    const col = await this.collection();
    const now = new Date();
    const fresh = new Date(now.getTime() + this.windowMs);
    const res = await col.findOneAndUpdate(
      { _id: this.id(key) },
      [
        {
          $set: {
            count: { $cond: [{ $gt: ["$expiresAt", now] }, { $add: ["$count", 1] }, 1] },
            expiresAt: { $cond: [{ $gt: ["$expiresAt", now] }, "$expiresAt", fresh] },
          },
        },
      ],
      { upsert: true, returnDocument: "after" }
    );
    const doc = res?.value ?? res; 
    return { totalHits: doc.count, resetTime: doc.expiresAt };
  }

  async decrement(key) {
    const col = await this.collection();
    await col.updateOne({ _id: this.id(key), count: { $gt: 0 } }, { $inc: { count: -1 } });
  }

  async resetKey(key) {
    const col = await this.collection();
    await col.deleteOne({ _id: this.id(key) });
  }
}