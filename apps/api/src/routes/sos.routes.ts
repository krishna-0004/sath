import { Router } from "express";
import { sosController } from "../controllers/sos.controller.js";
import { requireAuthMiddleware } from "../middleware/require-auth.js";
import { requireProfileMember } from "../middleware/require-profile-member.js";
import { requireProfileRole } from "../middleware/require-profile-role.js";
import { validate } from "../middleware/validate.js";
import { triggerSosSchema } from "../schemas/sos.schema.js";

export const sosRouter = Router();

// Profile-scoped SOS trigger
sosRouter.post(
  "/profiles/:profileId/sos",
  requireAuthMiddleware,
  requireProfileMember,
  requireProfileRole("elder", "editor"),
  validate({ body: triggerSosSchema }),
  sosController.triggerSos,
);

// Public token-based emergency access
sosRouter.get("/share/:token", sosController.getEmergencyShare);
