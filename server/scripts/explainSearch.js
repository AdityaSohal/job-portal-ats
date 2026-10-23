import "dotenv/config";
import mongoose from "mongoose";
import Job from "../models/Job.js";

const active = () => ({
  status: "active",
  $or: [{ deadline: null }, { deadline: { $gt: new Date() } }],
});

const walk = (stage, out = []) => {
  if (!stage) return out;
  out.push(stage.indexName ? `${stage.stage}(${stage.indexName})` : stage.stage);
  walk(stage.inputStage, out);
  (stage.inputStages || []).forEach((s) => walk(s, out));
  return out;
};

const CASES = [
  ["latest, no filters", active(), { createdAt: -1, _id: -1 }],
  ["workMode + location", { ...active(), workMode: "hybrid", location: /bengal/i }, { createdAt: -1 }],
  ["skills", { ...active(), skills: { $in: ["react", "node.js"] } }, { createdAt: -1 }],
  ["closing soon", { ...active(), deadline: { $gt: new Date() } }, { deadline: 1, _id: 1 }],
  ["keyword search", { ...active(), $text: { $search: "backend" } }, { createdAt: -1 }],
  ["recruiter's jobs", { recruiterId: new mongoose.Types.ObjectId(), status: "active" }, { createdAt: -1 }],
];

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await Job.init(); 

  for (const [name, filter, sort] of CASES) {
    const ex = await Job.find(filter).sort(sort).limit(10).explain("executionStats");
    const plan = ex.queryPlanner.winningPlan.queryPlan || ex.queryPlanner.winningPlan;
    const s = ex.executionStats;
    console.log(`\n${name}`);
    console.log(`  plan:     ${walk(plan).join(" > ")}`);
    console.log(`  keys examined: ${s.totalKeysExamined}, docs examined: ${s.totalDocsExamined}, returned: ${s.nReturned}`);
  }
};

run()
  .catch((err) => {
    console.error("Explain failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());