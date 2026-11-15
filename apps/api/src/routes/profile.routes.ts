import { Router } from "express";
import { profileController } from "../controllers/profile.controller.js";
import { requireAuthMiddleware } from "../middleware/require-auth.js";
import { requireProfileMember } from "../middleware/require-profile-member.js";
import { requireProfileRole } from "../middleware/require-profile-role.js";
import { validate } from "../middleware/validate.js";
import {
  createProfileSchema,
  joinProfileSchema,
  rotatePasscodeSchema,
  updateMemberRoleSchema,
  updateProfileSchema,
  updateSharingSchema,
} from "../schemas/profile.schema.js";

export function createProfileRouter(): Router {
  const router = Router();

  // All profile operations require authentication
  router.use(requireAuthMiddleware);

  // Profile lifecycle & discovery
  router.post("/", validate({ body: createProfileSchema }), profileController.create);
  router.get("/", profileController.list);
  router.post("/join", validate({ body: joinProfileSchema }), profileController.join);

  // Operations on specific profile
  router.get("/:id", requireProfileMember, profileController.get);
  router.patch(
    "/:id",
    requireProfileMember,
    requireProfileRole("elder", "editor"),
    validate({ body: updateProfileSchema }),
    profileController.update,
  );
  router.delete(
    "/:id",
    requireProfileMember,
    requireProfileRole("elder"),
    profileController.delete,
  );

  // Passcode rotation (elder only)
  router.post(
    "/:id/rotate-passcode",
    requireProfileMember,
    requireProfileRole("elder"),
    validate({ body: rotatePasscodeSchema }),
    profileController.rotatePasscode,
  );

  // Sharing toggles (elder only)
  router.patch(
    "/:id/sharing",
    requireProfileMember,
    requireProfileRole("elder"),
    validate({ body: updateSharingSchema }),
    profileController.updateSharing,
  );

  // Members management
  router.get("/:id/members", requireProfileMember, profileController.listMembers);
  router.patch(
    "/:id/members/:userId",
    requireProfileMember,
    requireProfileRole("elder"),
    validate({ body: updateMemberRoleSchema }),
    profileController.updateMemberRole,
  );
  router.delete("/:id/members/:userId", requireProfileMember, profileController.removeMember);

  return router;
}

export const profileRouter = createProfileRouter();
