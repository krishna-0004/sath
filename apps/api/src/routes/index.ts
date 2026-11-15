import { Router } from "express";
import type { AuthControllerDependencies } from "../controllers/auth.controller.js";
import { createAuthRouter } from "./auth.routes.js";
import { healthRouter } from "./health.routes.js";
import { profileRouter } from "./profile.routes.js";
import { uploadRouter } from "./upload.routes.js";

export function createApiRouter(deps: AuthControllerDependencies = {}): Router {
  const router = Router();
  router.use(healthRouter);
  router.use("/auth", createAuthRouter(deps));
  router.use("/profiles", profileRouter);
  router.use(uploadRouter);
  return router;
}

export const apiRouter = createApiRouter();
