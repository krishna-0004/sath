import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "../../../components/ui/Card.js";
import { careApi } from "../api.js";
import type { MetricComparisonResponse, Profile, Report } from "../types.js";
import { ReportLensModal } from "./ReportLensModal.js";

export interface ReportsViewProps {
  profile: Profile;
  canEdit: boolean;
  isElder: boolean;
}

export function ReportsView({ profile, canEdit, isElder }: ReportsViewProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<string>("");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const {
    data: reportsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["reports", profile.id],
    queryFn: () => careApi.getReports(profile.id),
  });

  const reports = reportsData?.reports || [];

  // Collect unique metric names across reports for trend comparison
  const uniqueMetricNames = Array.from(
    new Set(reports.flatMap((r) => r.metrics.map((m) => m.name))),
  ).sort();

  // Active comparison query
  const { data: comparisonData, isLoading: isComparisonLoading } =
    useQuery<MetricComparisonResponse | null>({
      queryKey: ["metric-compare", profile.id, selectedMetric],
      queryFn: () =>
        selectedMetric
          ? careApi.compareReportMetric(profile.id, selectedMetric)
          : Promise.resolve(null),
      enabled: Boolean(selectedMetric),
    });

  const deleteReportMutation = useMutation({
    mutationFn: (reportId: string) => careApi.deleteReport(profile.id, reportId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["reports", profile.id] });
      setSelectedReport(null);
    },
  });

  return (
    <div className="space-y-8">
      {/* Top Banner & Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Lab Reports & Biomarkers
          </h2>
          <p className="text-lg text-slate-600 mt-1">
            Transcribe, review, and track lab test metrics neutrally.
          </p>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={() => setIsScanModalOpen(true)}
            className="flex items-center justify-center gap-3 px-8 py-4 min-h-[76px] rounded-2xl bg-emerald-700 text-white font-bold text-xl hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-300 shadow-md transition-all active:scale-[0.98]"
          >
            <span className="text-2xl" aria-hidden="true">
              📄
            </span>
            <span>Scan Lab Report</span>
          </button>
        )}
      </div>

      {/* Rule 9 Mandatory Advisory Banner */}
      <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 text-base leading-relaxed">
        <strong>Important notice:</strong> Saath displays verbatim transcriptions and mathematical
        differences between tests. Saath never diagnoses, predicts prognosis, or provides medical
        opinions. Consult your physician for medical advice.
      </div>

      {isLoading && (
        <Card className="p-8 text-center text-lg text-slate-600">Loading lab reports...</Card>
      )}

      {error && (
        <Card className="p-8 text-center text-lg text-amber-900 bg-amber-50 border-amber-200">
          Failed to load reports. Please try refreshing.
        </Card>
      )}

      {!isLoading && reports.length === 0 && (
        <Card className="p-12 text-center space-y-4">
          <span className="text-6xl" aria-hidden="true">
            🔬
          </span>
          <h3 className="text-2xl font-bold text-slate-800">No lab reports recorded</h3>
          <p className="text-lg text-slate-600 max-w-md mx-auto">
            Scan a paper lab test report or blood work to transcribe metrics and track changes over
            time.
          </p>
          {canEdit && (
            <div className="pt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setIsScanModalOpen(true)}
                className="px-8 py-4 min-h-[76px] rounded-2xl bg-emerald-700 text-white font-bold text-xl hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-300 transition-all"
              >
                Scan First Report
              </button>
            </div>
          )}
        </Card>
      )}

      {/* What Changed Feed / Biomarker Comparison Section */}
      {reports.length > 0 && (
        <div className="space-y-6">
          <Card className="p-6 space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-slate-900">
                What Changed — Biomarker Trend Comparison
              </h3>
              <p className="text-base text-slate-600 mt-1">
                Select a biomarker to compute the mathematical difference from the previous test.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {uniqueMetricNames.map((name) => {
                const isSelected = selectedMetric === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setSelectedMetric(isSelected ? "" : name)}
                    aria-pressed={isSelected}
                    className={`px-4 py-3 min-h-[48px] rounded-xl font-bold text-base transition-all focus:outline-none focus:ring-2 focus:ring-emerald-600 ${
                      isSelected
                        ? "bg-emerald-700 text-white shadow-xs"
                        : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>

            {isComparisonLoading && (
              <p className="text-base text-slate-600">Calculating comparison...</p>
            )}

            {comparisonData && comparisonData.current && (
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <h4 className="text-xl font-bold text-slate-900">
                      {comparisonData.metricName}
                    </h4>
                    <span className="text-sm text-slate-500">
                      Current: {comparisonData.current.value} {comparisonData.current.unit} (
                      {new Date(comparisonData.current.testDate).toLocaleDateString()})
                    </span>
                  </div>
                  {comparisonData.previous && (
                    <span className="text-sm text-slate-500">
                      Previous: {comparisonData.previous.value} {comparisonData.previous.unit} (
                      {new Date(comparisonData.previous.testDate).toLocaleDateString()})
                    </span>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200">
                  <p className="text-lg font-semibold text-slate-800">
                    Observation: {comparisonData.comparison.neutralDiffText}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">Ask the doctor about this.</p>
                </div>
              </div>
            )}
          </Card>

          {/* Reports History List */}
          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-slate-900">
              Recorded Reports ({reports.length})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reports.map((report) => (
                <Card
                  key={report.id}
                  className="p-6 flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xl font-bold text-slate-900">{report.title}</h4>
                      <span className="text-sm font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                        {new Date(report.testDate).toLocaleDateString()}
                      </span>
                    </div>

                    {report.labName && (
                      <p className="text-base text-slate-600 font-medium">Lab: {report.labName}</p>
                    )}

                    <p className="text-base text-slate-600">
                      {report.metrics.length} metric{report.metrics.length === 1 ? "" : "s"}{" "}
                      recorded
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setSelectedReport(report)}
                      className="px-4 py-2 min-h-[44px] rounded-xl text-emerald-800 font-bold hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    >
                      View Details
                    </button>

                    {isElder && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm("Are you sure you want to delete this report?")) {
                            deleteReportMutation.mutate(report.id);
                          }
                        }}
                        className="px-3 py-2 min-h-[44px] rounded-xl text-stone-600 hover:text-red-700 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-red-400"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Report Details Modal */}
      {selectedReport && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-details-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
        >
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="report-details-title" className="text-2xl font-bold text-slate-900">
                  {selectedReport.title}
                </h2>
                <p className="text-base text-slate-600 mt-1">
                  Test Date: {new Date(selectedReport.testDate).toLocaleDateString()}
                  {selectedReport.labName && ` • Lab: ${selectedReport.labName}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 text-xl font-bold"
                aria-label="Close details"
              >
                ✕
              </button>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 text-base font-semibold text-slate-700">Metric</th>
                    <th className="py-3 px-4 text-base font-semibold text-slate-700">Value</th>
                    <th className="py-3 px-4 text-base font-semibold text-slate-700">Reference</th>
                    <th className="py-3 px-4 text-base font-semibold text-slate-700">Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedReport.metrics.map((m, idx) => (
                    <tr key={idx}>
                      <td className="py-3 px-4 font-bold text-slate-900">{m.name}</td>
                      <td className="py-3 px-4 text-slate-800">
                        {m.value} {m.unit}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{m.referenceRangeText || "—"}</td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">
                          {m.flag}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-sm">
              Saath displays what the laboratory report states. Saath does not diagnose or give
              medical guidance. Ask the doctor about this.
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="px-6 py-3 min-h-[48px] rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scan & Extract Modal */}
      <ReportLensModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        profileId={profile.id}
        onSuccess={() => {
          void queryClient.invalidateQueries({ queryKey: ["reports", profile.id] });
        }}
      />
    </div>
  );
}
