import type { Request, Response } from "express";
import { medicineService } from "../services/medicine.service.js";
import { UnauthenticatedError } from "../errors/http-errors.js";
import type { CreateMedicineInput, UpdateMedicineInput } from "../schemas/medicine.schema.js";

function getUserId(req: Request): string {
  const userId = req.auth?.userId;
  if (!userId) {
    throw new UnauthenticatedError("Authentication required");
  }
  return userId;
}

function getParam(req: Request, name: string): string {
  const val = req.params[name];
  if (!val) return "";
  return Array.isArray(val) ? val[0]! : val;
}

export const medicineController = {
  async create(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const profileId = getParam(req, "id") || getParam(req, "profileId");
    const input = (req.validated?.body ?? req.body) as CreateMedicineInput;

    const medicine = await medicineService.createMedicine(profileId, userId, input, req.requestId);
    res.status(201).json({ medicine: medicine.toJSON() });
  },

  async list(req: Request, res: Response): Promise<void> {
    const profileId = getParam(req, "id") || getParam(req, "profileId");
    const medicines = await medicineService.listMedicines(profileId);
    res.json({ medicines: medicines.map((m) => m.toJSON()) });
  },

  async update(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const profileId = getParam(req, "id") || getParam(req, "profileId");
    const medicineId = getParam(req, "medId");
    const input = (req.validated?.body ?? req.body) as UpdateMedicineInput;

    const updated = await medicineService.updateMedicine(
      profileId,
      medicineId,
      userId,
      input,
      req.requestId,
    );
    res.json({ medicine: updated.toJSON() });
  },

  async stop(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const profileId = getParam(req, "id") || getParam(req, "profileId");
    const medicineId = getParam(req, "medId");

    const stopped = await medicineService.stopMedicine(
      profileId,
      medicineId,
      userId,
      req.requestId,
    );
    res.json({ medicine: stopped.toJSON() });
  },
};
