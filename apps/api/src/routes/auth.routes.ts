import { Router } from "express";
import {
  createAuthController,
  type AuthControllerDependencies,
} from "../controllers/auth.controller.js";
import { authLimiter, refreshLimiter } from "../middleware/rate-limit.js";
import { requireAuthMiddleware } from "../middleware/require-auth.js";

export function createAuthRouter(deps: AuthControllerDependencies = {}): Router {
  const router = Router();
  const controller = createAuthController(deps);

  // Enforce Cache-Control: no-store across all authentication routes
  router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  // OAuth Initiation and Callback (rate limited: 20/15min)
  router.get("/google", authLimiter, controller.initiateGoogleAuth);
  router.get("/google/callback", authLimiter, controller.handleGoogleCallback);

  // Authenticated user profile
  router.get("/me", requireAuthMiddleware, controller.getMe);

  // Token rotation (rate limited: 60/15min)
  router.post("/refresh", refreshLimiter, controller.refreshToken);

  // Session termination
  router.post("/logout", controller.logoutSession);
  router.post("/logout-all", requireAuthMiddleware, controller.logoutAllSessions);

  // Demo user login (rate limited: 20/15min)
  router.post("/demo", authLimiter, controller.demoLogin);

  return router;
}
