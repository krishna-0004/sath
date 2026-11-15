import { Router } from "express";
import { healthCheck, readyCheck } from "../controllers/health.controller.js";

export const healthRouter = Router();

healthRouter.get("/health", healthCheck);
healthRouter.get("/ready", readyCheck);
