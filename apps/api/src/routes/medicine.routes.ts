import { Router } from "express";
import { medicineController } from "../controllers/medicine.controller.js";
import { requireCategory } from "../middleware/require-category.js";
import { requireProfileRole } from "../middleware/require-profile-role.js";
import { validate } from "../middleware/validate.js";
import { createMedicineSchema, updateMedicineSchema } from "../schemas/medicine.schema.js";

export function createMedicineRouter(): Router {
  const router = Router({ mergeParams: true });

  router.post(
    "/",
    requireProfileRole("elder", "editor"),
    validate({ body: createMedicineSchema }),
    medicineController.create,
  );

  router.get("/", requireCategory("medicines"), medicineController.list);

  router.patch(
    "/:medId",
    requireProfileRole("elder", "editor"),
    validate({ body: updateMedicineSchema }),
    medicineController.update,
  );

  router.post("/:medId/stop", requireProfileRole("elder", "editor"), medicineController.stop);

  return router;
}

export const medicineRouter = createMedicineRouter();
