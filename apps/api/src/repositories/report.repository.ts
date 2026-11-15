import { type ReportDocument, ReportModel, type ReportMetric } from "../models/report.model.js";

export const reportRepository = {
  async create(data: {
    profileId: string;
    title: string;
    testDate: Date;
    labName?: string;
    metrics: ReportMetric[];
    fileUrl?: string;
    notes?: string;
    createdBy: string;
  }): Promise<ReportDocument> {
    return ReportModel.create(data);
  },

  async findByProfile(profileId: string): Promise<ReportDocument[]> {
    return ReportModel.find({ profileId }).sort({ testDate: -1 }).exec();
  },

  async findById(reportId: string): Promise<ReportDocument | null> {
    return ReportModel.findById(reportId).exec();
  },

  async delete(reportId: string): Promise<boolean> {
    const res = await ReportModel.findByIdAndDelete(reportId).exec();
    return Boolean(res);
  },

  async findMetricHistory(profileId: string, metricName: string): Promise<ReportDocument[]> {
    const regex = new RegExp(`^${metricName.trim()}$`, "i");
    return ReportModel.find({
      profileId,
      "metrics.name": { $regex: regex },
    })
      .sort({ testDate: 1 })
      .exec();
  },
};
