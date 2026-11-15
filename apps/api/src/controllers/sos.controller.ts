import type { Request, Response } from "express";
import { sosService } from "../services/sos.service.js";

export const sosController = {
  async triggerSos(req: Request, res: Response): Promise<void> {
    const profileId = req.params.profileId as string;
    const userId = req.auth!.userId;

    const result = await sosService.triggerSos(profileId, userId, req.body, req.requestId);

    res.status(200).json(result);
  },

  async getEmergencyShare(req: Request, res: Response): Promise<void> {
    const token = req.params.token as string;

    const summary = await sosService.getEmergencySummaryByToken(token);

    res.status(200).json(summary);
  },
};
