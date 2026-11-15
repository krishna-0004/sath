import { DateTime } from "luxon";
import { NotFoundError } from "../errors/http-errors.js";
import { reportRepository } from "../repositories/report.repository.js";
import { auditEventRepository } from "../repositories/audit-event.repository.js";
import { aiClientService, type LabReportExtractionResult } from "./ai-client.service.js";
import { uploadService } from "./upload.service.js";
import type { CreateReportInput } from "../schemas/report.schema.js";
import type { MetricFlag, ReportDocument } from "../models/report.model.js";

export interface MetricComparisonPoint {
  reportId: string;
  reportTitle: string;
  testDate: Date;
  testDateFormatted: string;
  value: number | string;
  unit: string;
  referenceRangeText: string;
  flag: MetricFlag;
  diff: {
    absolute: number | null;
    percent: number | null;
    daysBetween: number | null;
    text: string;
  };
}

export interface MetricComparisonResult {
  metricName: string;
  history: MetricComparisonPoint[];
}

export const reportService = {
  async previewReport(profileId: string, uploadId: string): Promise<LabReportExtractionResult> {
    let base64Data: string | undefined;
    let mimeType: string | undefined;
    let imageUrl: string | undefined;

    try {
      const mockAsset = uploadService.getMockAsset(uploadId);
      if (mockAsset) {
        base64Data = mockAsset.buffer.toString("base64");
        mimeType = mockAsset.fileType;
      }
    } catch {
      imageUrl = `https://res.cloudinary.com/saath/image/authenticated/${uploadId}`;
    }

    return aiClientService.extractLabReport({
      base64Data,
      mimeType,
      imageUrl,
    });
  },

  async saveReport(
    profileId: string,
    userId: string,
    input: CreateReportInput,
    requestId?: string,
  ): Promise<ReportDocument> {
    const report = await reportRepository.create({
      profileId,
      title: input.title,
      testDate: new Date(input.testDate),
      labName: input.labName,
      metrics: input.metrics.map((m) => ({
        name: m.name,
        value: m.value,
        unit: m.unit,
        referenceRangeText: m.referenceRangeText,
        flag: m.flag,
      })),
      fileUrl: input.fileUrl,
      notes: input.notes,
      createdBy: userId,
    });

    await auditEventRepository.create({
      actorUserId: userId,
      action: "report.created",
      outcome: "success",
      metadata: { profileId, reportId: report.id, title: report.title },
      requestId: requestId ?? null,
    });

    return report;
  },

  async listReports(profileId: string): Promise<ReportDocument[]> {
    return reportRepository.findByProfile(profileId);
  },

  async getReportById(profileId: string, reportId: string): Promise<ReportDocument> {
    const report = await reportRepository.findById(reportId);
    if (!report || report.profileId.toString() !== profileId) {
      throw new NotFoundError("Report not found");
    }
    return report;
  },

  async deleteReport(
    profileId: string,
    reportId: string,
    userId: string,
    requestId?: string,
  ): Promise<void> {
    const report = await reportRepository.findById(reportId);
    if (!report || report.profileId.toString() !== profileId) {
      throw new NotFoundError("Report not found");
    }

    await reportRepository.delete(reportId);

    await auditEventRepository.create({
      actorUserId: userId,
      action: "report.deleted",
      outcome: "success",
      metadata: { profileId, reportId, title: report.title },
      requestId: requestId ?? null,
    });
  },

  async compareMetric(profileId: string, metricName: string): Promise<MetricComparisonResult> {
    const reports = await reportRepository.findMetricHistory(profileId, metricName);
    const history: MetricComparisonPoint[] = [];

    const normTarget = metricName.trim().toLowerCase();

    for (let i = 0; i < reports.length; i++) {
      const rep = reports[i]!;
      const metric = rep.metrics.find((m) => m.name.trim().toLowerCase() === normTarget);
      if (!metric) continue;

      const currDate = rep.testDate;
      const testDateFormatted = DateTime.fromJSDate(currDate).toFormat("dd MMM yyyy");

      let absoluteDiff: number | null = null;
      let percentDiff: number | null = null;
      let daysBetween: number | null = null;
      let diffText = "no prior test";

      if (history.length > 0) {
        const prevPoint = history[history.length - 1]!;
        const prevDate = prevPoint.testDate;
        daysBetween = Math.max(
          1,
          Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)),
        );

        const currNum =
          typeof metric.value === "number" ? metric.value : parseFloat(String(metric.value));
        const prevNum =
          typeof prevPoint.value === "number"
            ? prevPoint.value
            : parseFloat(String(prevPoint.value));

        if (!isNaN(currNum) && !isNaN(prevNum)) {
          absoluteDiff = Math.round((currNum - prevNum) * 100) / 100;
          if (prevNum !== 0) {
            percentDiff = Math.round(((currNum - prevNum) / prevNum) * 1000) / 10;
          }
          const sign = absoluteDiff > 0 ? "+" : "";
          const unitStr = metric.unit ? ` ${metric.unit}` : "";
          diffText = `changed by ${sign}${absoluteDiff}${unitStr} from ${prevPoint.testDateFormatted}`;
        }
      }

      history.push({
        reportId: rep.id,
        reportTitle: rep.title,
        testDate: currDate,
        testDateFormatted,
        value: metric.value,
        unit: metric.unit,
        referenceRangeText: metric.referenceRangeText,
        flag: metric.flag,
        diff: {
          absolute: absoluteDiff,
          percent: percentDiff,
          daysBetween,
          text: diffText,
        },
      });
    }

    return {
      metricName,
      history,
    };
  },
};
