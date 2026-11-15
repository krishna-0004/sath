import { Router } from "express";
import { appointmentController } from "../controllers/appointment.controller.js";
import { requireCategory } from "../middleware/require-category.js";
import { requireProfileRole } from "../middleware/require-profile-role.js";
import { validate } from "../middleware/validate.js";
import { createAppointmentSchema, updateAppointmentSchema } from "../schemas/appointment.schema.js";

export function createAppointmentRouter(): Router {
  const router = Router({ mergeParams: true });

  router.post(
    "/",
    requireProfileRole("elder", "editor"),
    validate({ body: createAppointmentSchema }),
    appointmentController.create,
  );

  router.get("/", requireCategory("appointments"), appointmentController.list);

  router.patch(
    "/:aptId",
    requireProfileRole("elder", "editor"),
    validate({ body: updateAppointmentSchema }),
    appointmentController.update,
  );

  router.delete("/:aptId", requireProfileRole("elder", "editor"), appointmentController.delete);

  return router;
}

export const appointmentRouter = createAppointmentRouter();
