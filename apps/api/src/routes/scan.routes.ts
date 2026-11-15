import { Router } from "express";
import { scanController } from "../controllers/scan.controller.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireProfileMember } from "../middleware/require-profile-member.js";
import { requireProfileRole } from "../middleware/require-profile-role.js";

export const scanRouter: Router = Router();

scanRouter.post(
  "/profiles/:id/scan/prescription/preview",
  requireAuth,
  requireProfileMember,
  requireProfileRole("elder", "editor"),
  (req, res, next) => {
    scanController.handlePreview(req, res).catch(next);
  },
);

scanRouter.post(
  "/profiles/:id/scan/prescription/confirm",
  requireAuth,
  requireProfileMember,
  requireProfileRole("elder", "editor"),
  (req, res, next) => {
    scanController.handleConfirm(req, res).catch(next);
  },
);
