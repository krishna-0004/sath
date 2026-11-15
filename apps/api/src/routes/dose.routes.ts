import { Router } from "express";
import { doseController } from "../controllers/dose.controller.js";
import { requireCategory } from "../middleware/require-category.js";
import { requireProfileRole } from "../middleware/require-profile-role.js";
import { validate } from "../middleware/validate.js";
import { recordDoseSchema, doseSummaryQuerySchema } from "../schemas/dose.schema.js";

export function createDoseRouter(): Router {
  const router = Router({ mergeParams: true });

  router.get("/today", requireCategory("medicines"), doseController.getToday);

  router.patch(
    "/:doseId",
    requireProfileRole("elder", "editor"),
    validate({ body: recordDoseSchema }),
    doseController.record,
  );

  router.get(
    "/summary",
    requireCategory("medicines"),
    validate({ query: doseSummaryQuerySchema }),
    doseController.getSummary,
  );

  return router;
}

export const doseRouter = createDoseRouter();
