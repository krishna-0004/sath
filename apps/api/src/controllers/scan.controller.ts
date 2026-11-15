import type { Request, Response } from "express";
import { prescriptionDiffService } from "../services/prescription-diff.service.js";
import {
  prescriptionPreviewSchema,
  prescriptionConfirmSchema,
} from "../schemas/prescription-diff.schema.js";
import { UnauthenticatedError } from "../errors/http-errors.js";

function getParam(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? val[0]! : val!;
}

export const scanController = {
  async handlePreview(req: Request, res: Response): Promise<void> {
    const profileId = getParam(req, "id");
    const parsed = prescriptionPreviewSchema.parse(req.body);

    const result = await prescriptionDiffService.previewPrescription(profileId, parsed.uploadId);

    res.status(200).json(result);
  },

  async handleConfirm(req: Request, res: Response): Promise<void> {
    const profileId = getParam(req, "id");
    const userId = req.auth?.userId;
    if (!userId) {
      throw new UnauthenticatedError("Authentication required");
    }

    const parsed = prescriptionConfirmSchema.parse(req.body);
    const requestId = req.headers["x-request-id"] as string | undefined;

    const result = await prescriptionDiffService.confirmPrescription(
      profileId,
      userId,
      parsed,
      requestId,
    );

    res.status(200).json(result);
  },
};
