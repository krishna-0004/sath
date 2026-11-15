import { Router } from "express";
import {
  createAuthController,
  type AuthControllerDependencies,
} from "../controllers/auth.controller.js";

export function createAuthRouter(deps: AuthControllerDependencies = {}): Router {
  const router = Router();
  const controller = createAuthController(deps);

  router.get("/google", controller.initiateGoogleAuth);
  router.get("/google/callback", controller.handleGoogleCallback);

  return router;
}
