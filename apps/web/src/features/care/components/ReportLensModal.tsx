import React, { useState } from "react";
import { Modal } from "../../../components/ui/Modal.js";
import { careApi } from "../api.js";
import type { ReportMetric, ReportPreviewResponse } from "../types.js";

export interface ReportLensModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: string;
  onSuccess: () => void;
}

type Step = "upload" | "analyzing" | "review" | "success";

export function ReportLensModal({
  isOpen,
  onClose,
  profileId,
  onSuccess,
}: ReportLensModalProps): React.JSX.Element {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorText, setErrorText] = useState("");

  const [title, setTitle] = useState("Lab Test Report");
  const [testDate, setTestDate] = useState(new Date().toISOString().slice(0, 10));
  const [labName, setLabName] = useState("");
  const [notes, setNotes] = useState("");
  const [metrics, setMetrics] = useState<ReportMetric[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetState = (): void => {
    setStep("upload");
    setFile(null);
    setDragOver(false);
    setStatusMessage("");
    setErrorText("");
    setTitle("Lab Test Report");
    setTestDate(new Date().toISOString().slice(0, 10));
    setLabName("");
    setNotes("");
    setMetrics([]);
    setIsSubmitting(false);
  };

  const handleClose = (): void => {
    resetState();
    onClose();
  };

  const handleFileSelect = async (selectedFile: File): Promise<void> => {
    if (!["image/jpeg", "image/png", "application/pdf"].includes(selectedFile.type)) {
      setErrorText("Please upload a JPG, PNG, or PDF file");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setErrorText("File size must be 10MB or less");
      return;
    }

    setFile(selectedFile);
    setErrorText("");
    setStep("analyzing");
    setStatusMessage("Extracting lab metrics, this takes 10 to 20 seconds...");

    try {
      const uploadRes = await careApi.uploadPrescriptionOrReport(profileId, selectedFile);
      const previewRes: ReportPreviewResponse = await careApi.previewReport(
        profileId,
        uploadRes.uploadId,
      );

      const p = previewRes.preview;
      setTitle(p.title || "Lab Test Report");
      if (p.testDate) {
        setTestDate(p.testDate.slice(0, 10));
      }
      setLabName(p.labName || "");
      setNotes(p.notes || "");
      setMetrics(p.metrics || []);

      setStatusMessage("Lab metrics extracted. Please review and confirm below.");
      setStep("review");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to extract lab report. Please try again.";
      setErrorText(msg);
      setStatusMessage("");
      setStep("upload");
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      void handleFileSelect(droppedFile);
    }
  };

  const handleSave = async (): Promise<void> => {
    if (metrics.length === 0) {
      setErrorText("At least one metric is required");
      return;
    }

    setIsSubmitting(true);
    setErrorText("");
    setStatusMessage("Saving report...");

    try {
      await careApi.createReport(profileId, {
        title,
        testDate,
        labName,
        notes,
        metrics,
      });

      setStatusMessage("Report successfully saved.");
      setStep("success");
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save report";
      setErrorText(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Report Lens — Lab Test Reader"
      description="Scan and review laboratory test biomarkers neutrally"
    >
      <div className="space-y-6">
        {/* Status announcer for screen readers */}
        <div aria-live="polite" className="sr-only">
          {statusMessage}
        </div>

        {errorText && (
          <div
            role="alert"
            className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-lg font-medium"
          >
            {errorText}
          </div>
        )}

        {/* STEP 1: Upload Dropzone */}
        {step === "upload" && (
          <div className="space-y-6">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-3 border-dashed rounded-2xl p-8 text-center transition-colors ${
                dragOver
                  ? "border-emerald-600 bg-emerald-50"
                  : "border-slate-300 hover:border-slate-400"
              }`}
            >
              <div className="flex flex-col items-center justify-center space-y-4">
                <span className="text-5xl" aria-hidden="true">
                  📄
                </span>
                <p className="text-xl font-bold text-slate-800">Upload Lab Report or Blood Test</p>
                <p className="text-base text-slate-600 max-w-md">
                  Drag and drop a photo or PDF of the report here, or choose from your files or
                  camera.
                </p>

                <label className="cursor-pointer inline-flex items-center justify-center px-8 py-5 min-h-[76px] rounded-2xl bg-emerald-700 text-white font-bold text-xl hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-300 shadow-sm transition-all active:scale-[0.98]">
                  <span>Choose Report File</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,application/pdf"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        void handleFileSelect(f);
                      }
                    }}
                  />
                </label>
                <p className="text-sm text-slate-500">Supports JPG, PNG, and PDF up to 10MB</p>
              </div>
            </div>

            {/* Rule 9 neutral explanation notice */}
            <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-base">
              <strong>About Report Lens:</strong> Saath extracts the metrics printed on your
              laboratory report. Saath does not diagnose conditions or give medical guidance. Always
              review your lab results directly with your doctor.
            </div>
          </div>
        )}

        {/* STEP 2: Analyzing Spinner */}
        {step === "analyzing" && (
          <div className="py-12 flex flex-col items-center justify-center space-y-6 text-center">
            <div
              className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-700 rounded-full animate-spin"
              role="progressbar"
              aria-label="Analyzing report"
            />
            <div className="space-y-2">
              <p className="text-2xl font-bold text-slate-800">Reading Lab Report</p>
              <p className="text-lg text-slate-600">
                Transcribing biomarker values, units, and reference ranges...
              </p>
              {file && <p className="text-sm text-slate-500 font-mono">{file.name}</p>}
            </div>
          </div>
        )}

        {/* STEP 3: Review Extracted Biomarkers */}
        {step === "review" && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 text-base">
              <p className="font-semibold">Review Extracted Biomarkers</p>
              <p className="mt-1">
                Please verify the test details and extracted values before saving. Nothing is saved
                until you confirm.
              </p>
            </div>

            {/* Metadata Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="report-title"
                  className="block text-base font-semibold text-slate-700 mb-1"
                >
                  Report Title
                </label>
                <input
                  id="report-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label
                  htmlFor="report-date"
                  className="block text-base font-semibold text-slate-700 mb-1"
                >
                  Test Date
                </label>
                <input
                  id="report-date"
                  type="date"
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label
                  htmlFor="report-lab"
                  className="block text-base font-semibold text-slate-700 mb-1"
                >
                  Laboratory Name
                </label>
                <input
                  id="report-lab"
                  type="text"
                  value={labName}
                  placeholder="e.g. Apollo Diagnostics"
                  onChange={(e) => setLabName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            {/* Biomarkers Table */}
            <div className="space-y-3">
              <h3 className="text-xl font-bold text-slate-800">
                Extracted Metrics ({metrics.length})
              </h3>
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 text-base font-semibold text-slate-700">
                        Biomarker
                      </th>
                      <th className="py-3 px-4 text-base font-semibold text-slate-700">
                        Value & Unit
                      </th>
                      <th className="py-3 px-4 text-base font-semibold text-slate-700">
                        Reference Range
                      </th>
                      <th className="py-3 px-4 text-base font-semibold text-slate-700">Flag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {metrics.map((metric, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-4 text-lg font-bold text-slate-900">
                          {metric.name}
                        </td>
                        <td className="py-4 px-4 text-lg text-slate-800 font-medium">
                          {metric.value} {metric.unit}
                        </td>
                        <td className="py-4 px-4 text-base text-slate-600">
                          {metric.referenceRangeText || "—"}
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${
                              metric.flag === "high" || metric.flag === "low"
                                ? "bg-amber-100 text-amber-900 border border-amber-300"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {metric.flag}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Rule 9 Mandatory Notice */}
            <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-base">
              <strong>Important:</strong> Saath does not diagnose or give medical guidance. This is
              what the laboratory report states. Ask the doctor about this.
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-4 min-h-[76px] rounded-2xl border-2 border-slate-300 text-slate-700 font-bold text-xl hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting || metrics.length === 0}
                onClick={() => void handleSave()}
                className="px-8 py-4 min-h-[76px] rounded-2xl bg-emerald-700 text-white font-bold text-xl hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-300 shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : "Confirm & Save Report"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Success Screen */}
        {step === "success" && (
          <div className="py-8 flex flex-col items-center justify-center space-y-6 text-center">
            <span className="text-6xl" aria-hidden="true">
              ✅
            </span>
            <div className="space-y-2">
              <h3 className="text-3xl font-extrabold text-slate-900">Report Successfully Saved</h3>
              <p className="text-xl text-slate-600">
                The laboratory metrics have been recorded in the profile.
              </p>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="px-10 py-5 min-h-[76px] rounded-2xl bg-emerald-700 text-white font-bold text-2xl hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-300 shadow-md transition-all active:scale-[0.98]"
            >
              Back to Reports
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
