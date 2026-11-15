import { Router } from "express";
import { doctorContactController } from "../controllers/doctor-contact.controller.js";
import { requireProfileRole } from "../middleware/require-profile-role.js";
import { validate } from "../middleware/validate.js";
import { createDoctorContactSchema } from "../schemas/doctor-contact.schema.js";

export function createDoctorContactRouter(): Router {
  const router = Router({ mergeParams: true });

  router.post(
    "/",
    requireProfileRole("elder"),
    validate({ body: createDoctorContactSchema }),
    doctorContactController.create,
  );

  router.get("/", requireProfileRole("elder"), doctorContactController.list);

  router.delete("/:contactId", requireProfileRole("elder"), doctorContactController.revoke);

  return router;
}

export const doctorContactRouter = createDoctorContactRouter();
