import React, { useState } from "react";
import { Modal } from "../../../components/ui/Modal.js";
import { Stepper } from "../../../components/ui/Stepper.js";
import { careApi } from "../api.js";
import type {
  PrescriptionDiff,
  PrescriptionPreviewResponse,
  ProposedMedicine,
  ProposedUpdateMedicine,
} from "../types.js";

export interface ScanConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: string;
  onSuccess: () => void;
}

type Step = "upload" | "analyzing" | "review" | "success";

export function ScanConfirmModal({
  isOpen,
  onClose,
  profileId,
  onSuccess,
}: ScanConfirmModalProps): React.JSX.Element {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorText, setErrorText] = useState("");

  const [diff, setDiff] = useState<PrescriptionDiff | null>(null);
  const [doctorNotes, setDoctorNotes] = useState("");
  const [appliedCounts, setAppliedCounts] = useState<{
    added: number;
    updated: number;
    stopped: number;
  } | null>(null);

  const resetState = (): void => {
    setStep("upload");
    setFile(null);
    setDragOver(false);
    setStatusMessage("");
    setErrorText("");
    setDiff(null);
    setDoctorNotes("");
    setAppliedCounts(null);
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
    setStatusMessage("Analyzing prescription, this usually takes 10 to 20 seconds...");

    try {
      const uploadRes = await careApi.uploadPrescriptionOrReport(profileId, selectedFile);
      const previewRes: PrescriptionPreviewResponse = await careApi.previewPrescription(
        profileId,
        uploadRes.uploadId,
      );

      setDiff(previewRes.diff);
      setDoctorNotes(previewRes.rawDoctorNotes);
      setStep("review");
      setStatusMessage("Prescription analyzed. Please review proposed changes below.");
    } catch (err: unknown) {
      setErrorText(
        err instanceof Error ? err.message : "Failed to analyze prescription. Please try again.",
      );
      setStep("upload");
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      void handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const updateAddedItem = (index: number, field: keyof ProposedMedicine, value: unknown): void => {
    if (!diff) return;
    const newAdded = [...diff.added];
    newAdded[index] = { ...newAdded[index]!, [field]: value };
    setDiff({ ...diff, added: newAdded });
  };

  const updateChangedItem = (
    index: number,
    field: keyof ProposedUpdateMedicine,
    value: unknown,
  ): void => {
    if (!diff) return;
    const newUpdated = [...diff.updated];
    newUpdated[index] = { ...newUpdated[index]!, [field]: value };
    setDiff({ ...diff, updated: newUpdated });
  };

  const handleConfirm = async (): Promise<void> => {
    if (!diff) return;
    setStatusMessage("Saving confirmed medicine changes...");

    try {
      const confirmRes = await careApi.confirmPrescription(profileId, {
        applyAdded: diff.added,
        applyUpdated: diff.updated,
        stopDiscontinuedIds: diff.possiblyDiscontinued.map((d) => d.id),
      });

      setAppliedCounts(confirmRes.applied);
      setStep("success");
      setStatusMessage("Medicines updated successfully.");
      onSuccess();
    } catch (err: unknown) {
      setErrorText(err instanceof Error ? err.message : "Failed to save confirmed medicines");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Scan Prescription & Review Changes">
      {/* Stepper Header */}
      <div className="mb-6">
        <Stepper
          steps={[
            { id: "capture", label: "Capture" },
            { id: "review", label: "Review" },
            { id: "saved", label: "Saved" },
          ]}
          currentStepIndex={
            step === "upload" || step === "analyzing" ? 0 : step === "review" ? 1 : 2
          }
        />
      </div>

      {/* Polite live region for screen readers */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {statusMessage}
      </div>

      {errorText && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-rose-300 bg-rose-50 p-4 text-base text-rose-900"
        >
          {errorText}
        </div>
      )}

      {/* STEP 1: UPLOAD SCREEN */}
      {step === "upload" && (
        <div className="space-y-4">
          <p className="text-base text-neutral-600">
            Take a clear photo of the prescription or upload an image/PDF document. You will review
            and confirm all changes before anything is saved.
          </p>

          <div
            role="region"
            aria-label="Upload prescription document"
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
              dragOver
                ? "border-emerald-600 bg-emerald-50"
                : "border-neutral-300 bg-neutral-50 hover:bg-neutral-100"
            }`}
          >
            <svg
              className="mb-3 h-12 w-12 text-neutral-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>

            <span className="mb-2 text-lg font-medium text-neutral-900">
              Drag prescription here or choose a file
            </span>
            <span className="mb-4 text-sm text-neutral-500">Supports JPG, PNG, PDF up to 10MB</span>

            <div className="flex flex-wrap justify-center gap-3">
              <label
                htmlFor="file-upload-input"
                className="inline-flex min-h-[56px] min-w-[140px] cursor-pointer items-center justify-center rounded-xl bg-emerald-700 px-5 text-base font-semibold text-white shadow-sm hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-300"
              >
                Choose file
                <input
                  id="file-upload-input"
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  className="sr-only"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      void handleFileSelect(e.target.files[0]);
                    }
                  }}
                />
              </label>

              <label
                htmlFor="camera-capture-input"
                className="inline-flex min-h-[56px] min-w-[140px] cursor-pointer items-center justify-center rounded-xl border border-neutral-300 bg-white px-5 text-base font-semibold text-neutral-800 shadow-sm hover:bg-neutral-50 focus:outline-none focus:ring-4 focus:ring-emerald-300 md:hidden"
              >
                Take photo
                <input
                  id="camera-capture-input"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      void handleFileSelect(e.target.files[0]);
                    }
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: ANALYZING LOADING SCREEN */}
      {step === "analyzing" && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div
            className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"
            role="status"
            aria-label="Analyzing"
          />
          <h3 className="text-xl font-bold text-neutral-900">Transcribing Prescription</h3>
          <p className="mt-2 text-base text-neutral-600">
            Analyzing prescription, this usually takes 10 to 20 seconds...
          </p>
          {file && <span className="mt-1 text-sm text-neutral-400">{file.name}</span>}
        </div>
      )}

      {/* STEP 3: DIFF REVIEW SCREEN */}
      {step === "review" && diff && (
        <div className="space-y-6">
          <div className="rounded-xl bg-amber-50 p-4 border border-amber-200">
            <h3 className="text-base font-bold text-amber-900">Elder Confirmation Required</h3>
            <p className="text-sm text-amber-800">
              Review every change carefully. You can edit any field before confirming. No medicines
              are changed until you click &quot;Confirm changes&quot;.
            </p>
          </div>

          {/* Section 1: New Medicines */}
          <div>
            <h3 className="mb-2 text-lg font-bold text-emerald-900">
              New Medicines ({diff.added.length})
            </h3>
            {diff.added.length === 0 ? (
              <p className="text-sm italic text-neutral-500">No new medicines found.</p>
            ) : (
              <div className="space-y-3">
                {diff.added.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-2"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label
                          htmlFor={`added-name-${idx}`}
                          className="block text-xs font-semibold text-neutral-700"
                        >
                          Name
                        </label>
                        <input
                          id={`added-name-${idx}`}
                          type="text"
                          value={item.name}
                          onChange={(e) => updateAddedItem(idx, "name", e.target.value)}
                          className="mt-1 w-full rounded-lg border border-neutral-300 p-2 text-base"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`added-strength-${idx}`}
                          className="block text-xs font-semibold text-neutral-700"
                        >
                          Strength
                        </label>
                        <input
                          id={`added-strength-${idx}`}
                          type="text"
                          value={item.strengthText}
                          onChange={(e) => updateAddedItem(idx, "strengthText", e.target.value)}
                          className="mt-1 w-full rounded-lg border border-neutral-300 p-2 text-base"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Dose Changes */}
          <div>
            <h3 className="mb-2 text-lg font-bold text-blue-900">
              Dose Changes ({diff.updated.length})
            </h3>
            {diff.updated.length === 0 ? (
              <p className="text-sm italic text-neutral-500">No dose changes detected.</p>
            ) : (
              <div className="space-y-3">
                {diff.updated.map((item, idx) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-2"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label
                          htmlFor={`updated-name-${idx}`}
                          className="block text-xs font-semibold text-neutral-700"
                        >
                          Medicine
                        </label>
                        <input
                          id={`updated-name-${idx}`}
                          type="text"
                          value={item.name}
                          disabled
                          className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-100 p-2 text-base text-neutral-700"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`updated-strength-${idx}`}
                          className="block text-xs font-semibold text-neutral-700"
                        >
                          New Strength
                        </label>
                        <input
                          id={`updated-strength-${idx}`}
                          type="text"
                          value={item.strengthText}
                          onChange={(e) => updateChangedItem(idx, "strengthText", e.target.value)}
                          className="mt-1 w-full rounded-lg border border-neutral-300 p-2 text-base"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Discontinued */}
          <div>
            <h3 className="mb-2 text-lg font-bold text-rose-900">
              Discontinued in New Prescription ({diff.possiblyDiscontinued.length})
            </h3>
            {diff.possiblyDiscontinued.length === 0 ? (
              <p className="text-sm italic text-neutral-500">No discontinued medicines.</p>
            ) : (
              <div className="space-y-2">
                {diff.possiblyDiscontinued.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/50 p-3"
                  >
                    <div>
                      <span className="font-semibold text-neutral-900">{item.name}</span>
                      <span className="ml-2 text-sm text-neutral-600">{item.strengthText}</span>
                    </div>
                    <span className="rounded bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-800">
                      Will be stopped
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Unchanged */}
          <div>
            <h3 className="mb-2 text-lg font-bold text-neutral-700">
              Unchanged Medicines ({diff.unchanged.length})
            </h3>
            {diff.unchanged.length === 0 ? (
              <p className="text-sm italic text-neutral-500">None</p>
            ) : (
              <ul className="list-disc pl-5 text-sm text-neutral-600 space-y-1">
                {diff.unchanged.map((item) => (
                  <li key={item.id}>
                    {item.name} ({item.strengthText})
                  </li>
                ))}
              </ul>
            )}
          </div>

          {doctorNotes && (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <span className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
                Doctor Notes
              </span>
              <p className="mt-1 text-sm text-neutral-700 italic">{doctorNotes}</p>
            </div>
          )}

          {/* Confirmation Action: Prominent touch target >= 76px */}
          <div className="pt-4 border-t border-neutral-200 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => void handleConfirm()}
              className="flex min-h-[76px] w-full items-center justify-center rounded-2xl bg-emerald-700 px-6 text-xl font-bold text-white shadow-md hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-300"
            >
              Confirm changes
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="min-h-[52px] w-full rounded-xl border border-neutral-300 bg-white text-base font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: SUCCESS SCREEN */}
      {step === "success" && appliedCounts && (
        <div className="py-6 text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h3 className="text-2xl font-bold text-neutral-900">Medicines Updated!</h3>
          <p className="text-base text-neutral-600">
            Successfully applied: {appliedCounts.added} added, {appliedCounts.updated} updated,{" "}
            {appliedCounts.stopped} stopped.
          </p>

          <div className="pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex min-h-[76px] w-full items-center justify-center rounded-2xl bg-emerald-700 px-6 text-xl font-bold text-white shadow-md hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-300"
            >
              Return to Today view
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
