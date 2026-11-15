import type { Request, Response } from "express";
import { reportService } from "../services/report.service.js";
import { reportPreviewSchema, createReportSchema } from "../schemas/report.schema.js";
import { UnauthenticatedError, ValidationError } from "../errors/http-errors.js";

function getParam(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? val[0]! : val!;
}

export const reportController = {
  async handlePreview(req: Request, res: Response): Promise<void> {
    const profileId = getParam(req, "id");
    const parsed = reportPreviewSchema.parse(req.body);

    const result = await reportService.previewReport(profileId, parsed.uploadId);
    res.status(200).json(result);
  },

  async handleCreate(req: Request, res: Response): Promise<void> {
    const profileId = getParam(req, "id");
    const userId = req.auth?.userId;
    if (!userId) {
      throw new UnauthenticatedError("Authentication required");
    }

    const parsed = createReportSchema.parse(req.body);
    const requestId = req.headers["x-request-id"] as string | undefined;

    const report = await reportService.saveReport(profileId, userId, parsed, requestId);
    res.status(201).json({ report });
  },

  async handleList(req: Request, res: Response): Promise<void> {
    const profileId = getParam(req, "id");
    const reports = await reportService.listReports(profileId);
    res.status(200).json({ reports });
  },

  async handleGetById(req: Request, res: Response): Promise<void> {
    const profileId = getParam(req, "id");
    const reportId = getParam(req, "reportId");

    const report = await reportService.getReportById(profileId, reportId);
    res.status(200).json({ report });
  },

  async handleDelete(req: Request, res: Response): Promise<void> {
    const profileId = getParam(req, "id");
    const reportId = getParam(req, "reportId");
    const userId = req.auth?.userId;
    if (!userId) {
      throw new UnauthenticatedError("Authentication required");
    }

    const requestId = req.headers["x-request-id"] as string | undefined;
    await reportService.deleteReport(profileId, reportId, userId, requestId);
    res.status(204).end();
  },

  async handleCompare(req: Request, res: Response): Promise<void> {
    const profileId = getParam(req, "id");
    const metricName = req.query["metricName"];

    if (!metricName || typeof metricName !== "string") {
      throw new ValidationError("Query parameter metricName is required");
    }

    const result = await reportService.compareMetric(profileId, metricName);
    res.status(200).json(result);
  },
};
