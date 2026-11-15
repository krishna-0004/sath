import type { Request, Response } from "express";
import { doseService } from "../services/dose.service.js";
import { NotFoundError, UnauthenticatedError } from "../errors/http-errors.js";
import type { RecordDoseInput, DoseSummaryQueryInput } from "../schemas/dose.schema.js";

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

export const doseController = {
  async getToday(req: Request, res: Response): Promise<void> {
    const profile = req.profile;
    if (!profile) {
      throw new NotFoundError("Profile not found");
    }

    const doses = await doseService.getTodayDoses(profile);
    res.json({ doses });
  },

  async record(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const profileId = getParam(req, "id") || getParam(req, "profileId");
    const doseId = getParam(req, "doseId");
    const input = (req.validated?.body ?? req.body) as RecordDoseInput;

    const updated = await doseService.recordDose(profileId, doseId, userId, input, req.requestId);
    res.json({ dose: updated.toJSON() });
  },

  async getSummary(req: Request, res: Response): Promise<void> {
    const profile = req.profile;
    if (!profile) {
      throw new NotFoundError("Profile not found");
    }

    const query = (req.validated?.query ?? req.query) as DoseSummaryQueryInput;
    const days = query.days ? Number(query.days) : 7;
    const summary = await doseService.getSummary(profile, days);
    res.json({ summary });
  },
};
