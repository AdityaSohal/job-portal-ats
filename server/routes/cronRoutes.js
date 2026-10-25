import { Router } from "express";
import { cronAuth } from "../middlewares/cronAuth.js";
import { runDaily } from "../controllers/cronController.js";

const router = Router();
router.get("/daily", cronAuth, runDaily);

export default router;