import { Router } from "express";
import multer from "multer";
import { uploadController } from "../controllers/upload.controller.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireProfileMember } from "../middleware/require-profile-member.js";
import { requireProfileRole } from "../middleware/require-profile-role.js";

const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

export const uploadRouter: Router = Router();

uploadRouter.post(
  "/profiles/:id/uploads/prescription-or-report",
  requireAuth,
  requireProfileMember,
  requireProfileRole("elder", "editor"),
  uploadMiddleware.single("file"),
  (req, res, next) => {
    uploadController.handleUpload(req, res).catch(next);
  },
);

uploadRouter.get("/mock-uploads/:uploadId", (req, res, next) => {
  uploadController.serveMockUpload(req, res).catch(next);
});
