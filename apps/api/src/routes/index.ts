import { Router } from "express";
import type { AuthControllerDependencies } from "../controllers/auth.controller.js";
import { createAuthRouter } from "./auth.routes.js";
import { healthRouter } from "./health.routes.js";

export function createApiRouter(deps: AuthControllerDependencies = {}): Router {
  const router = Router();
  router.use(healthRouter);
  router.use("/auth", createAuthRouter(deps));
  return router;
}

export const apiRouter = createApiRouter();
