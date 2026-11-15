import { Router } from "express";
import { reportController } from "../controllers/report.controller.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireProfileMember } from "../middleware/require-profile-member.js";
import { requireProfileRole } from "../middleware/require-profile-role.js";
import { requireCategory } from "../middleware/require-category.js";

export const reportRouter: Router = Router();

reportRouter.post(
  "/profiles/:id/reports/preview",
  requireAuth,
  requireProfileMember,
  requireProfileRole("elder", "editor"),
  (req, res, next) => {
    reportController.handlePreview(req, res).catch(next);
  },
);

reportRouter.post(
  "/profiles/:id/reports",
  requireAuth,
  requireProfileMember,
  requireProfileRole("elder", "editor"),
  (req, res, next) => {
    reportController.handleCreate(req, res).catch(next);
  },
);

reportRouter.get(
  "/profiles/:id/reports/compare",
  requireAuth,
  requireProfileMember,
  requireCategory("reports"),
  (req, res, next) => {
    reportController.handleCompare(req, res).catch(next);
  },
);

reportRouter.get(
  "/profiles/:id/reports",
  requireAuth,
  requireProfileMember,
  requireCategory("reports"),
  (req, res, next) => {
    reportController.handleList(req, res).catch(next);
  },
);

reportRouter.get(
  "/profiles/:id/reports/:reportId",
  requireAuth,
  requireProfileMember,
  requireCategory("reports"),
  (req, res, next) => {
    reportController.handleGetById(req, res).catch(next);
  },
);

reportRouter.delete(
  "/profiles/:id/reports/:reportId",
  requireAuth,
  requireProfileMember,
  requireProfileRole("elder"),
  (req, res, next) => {
    reportController.handleDelete(req, res).catch(next);
  },
);
