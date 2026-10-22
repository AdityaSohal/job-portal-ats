import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    logoUrl: { type: String },
    website: { type: String, trim: true },
    description: { type: String, maxlength: 2000 },
    industry: { type: String, trim: true },
    size: { type: String, enum: ["1-10", "11-50", "51-200", "201-1000", "1000+"] },
    location: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

companySchema.index({ name: 1 });

export default mongoose.model("Company", companySchema);