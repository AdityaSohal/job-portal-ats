import multer from "multer";
import path from "path";
import ApiError from "../utils/ApiError.js";

const ALLOWED_EXT = [".pdf", ".docx"];

export const uploadResumeFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 5 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) return cb(new ApiError(400, "Only PDF and DOCX files are allowed"));
    cb(null, true);
  },
}).single("resume");