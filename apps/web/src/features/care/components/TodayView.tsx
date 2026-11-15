import React, { useState } from "react";
import { Clock, CheckCircle2, AlertCircle, HelpCircle, ArrowRight } from "lucide-react";
import { Badge } from "../../../components/ui/Badge.js";
import { Button } from "../../../components/ui/Button.js";
import { Card } from "../../../components/ui/Card.js";
import { Modal } from "../../../components/ui/Modal.js";
import { LoadingState } from "../../../components/ui/LoadingState.js";
import { ProgressRing } from "../../../components/ui/ProgressRing.js";
import { EmptyMedicines } from "../../../components/illustrations/index.js";
import { useRecordDose, useTodayDoses } from "../hooks/use-care-queries.js";
import type { DoseEvent, DoseStatus, Medicine, Profile } from "../types.js";

export interface TodayViewProps {
  profile: Profile;
  canEdit: boolean;
}

export function TodayView({ profile, canEdit }: TodayViewProps): React.JSX.Element {
  const { data, isLoading, error } = useTodayDoses(profile.id);
  const recordMutation = useRecordDose(profile.id);

  // Screen reader receipt announcement and visual receipt overlay
  const [receiptMessage, setReceiptMessage] = useState("");
  const [showCheckReceipt, setShowCheckReceipt] = useState(false);

  // Exception modal state
  const [activeDose, setActiveDose] = useState<DoseEvent | null>(null);
  const [exceptionType, setExceptionType] = useState<"spilled" | "skipped">("skipped");
  const [reasonText, setReasonText] = useState("");

  const handleMarkTaken = async (dose: DoseEvent) => {
    const medName =
      typeof dose.medicine === "object" && dose.medicine !== null
        ? (dose.medicine as Medicine).name
        : "Medication";

    try {
      await recordMutation.mutateAsync({
        doseId: dose.id,
        status: "taken",
      });
      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setReceiptMessage(`${medName} recorded as taken at ${timeStr}`);
      setShowCheckReceipt(true);
      setTimeout(() => setShowCheckReceipt(false), 1500);
    } catch {
      setReceiptMessage(`Failed to record ${medName}. Please try again.`);
    }
  };

  const handleExceptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDose) return;

    const medName =
      typeof activeDose.medicine === "object" && activeDose.medicine !== null
        ? (activeDose.medicine as Medicine).name
        : "Medication";

    try {
      await recordMutation.mutateAsync({
        doseId: activeDose.id,
        status: exceptionType as DoseStatus,
        reasonText: reasonText.trim(),
      });
      const label = exceptionType === "skipped" ? "Skipped by choice" : "Recorded as spilled";
      setReceiptMessage(`${medName}: ${label}`);
      setActiveDose(null);
      setReasonText("");
    } catch {
      setReceiptMessage(`Failed to update ${medName}. Please try again.`);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading today's medication routine..." />;
  }

  if (error) {
    return (
      <Card className="p-8 text-center bg-danger-soft border-danger/30">
        <h3 className="text-xl font-bold text-danger mb-2">Unable to load today&apos;s routine</h3>
        <p className="text-ink-muted">Please check your connection and refresh.</p>
      </Card>
    );
  }

  const doses = data?.doses || [];
  const takenCount = doses.filter((d) => d.status === "taken").length;
  const nextPendingDose = doses.find((d) => d.status === "pending");

  // Get current greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-8">
      {/* Live Region for Screen Readers */}
      <div role="status" aria-live="polite" className="sr-only">
        {receiptMessage}
      </div>

      {/* Full-Screen "Recorded ✓" Check Receipt Overlay */}
      {showCheckReceipt && (
        <div
          role="status"
          aria-live="assertive"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-surface/90 backdrop-blur-md animate-fade-in"
        >
          <div className="w-24 h-24 rounded-full bg-success flex items-center justify-center text-white mb-4 shadow-xl">
            <svg
              className="w-14 h-14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-3xl font-black text-ink font-display">Recorded ✓</h2>
          <p className="text-lg text-ink-muted mt-1">{receiptMessage}</p>
        </div>
      )}

      {/* Top Banner: Greeting, Date, & Progress Ring */}
      <div className="p-6 sm:p-8 rounded-[28px] bg-surface border border-line shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <Badge variant="primary">{greeting}</Badge>
          <h2 className="text-3xl sm:text-4xl font-black text-ink font-display mt-2">
            {profile.elderName}&apos;s Routine
          </h2>
          <p className="text-base text-ink-muted">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}{" "}
            • {profile.timezone}
          </p>
        </div>

        {doses.length > 0 && (
          <div className="flex items-center gap-4 bg-surface-2 p-3 sm:p-4 rounded-2xl border border-line">
            <ProgressRing current={takenCount} total={doses.length} size={84} />
            <div className="text-left">
              <span className="text-lg font-bold text-ink block">Today&apos;s Goal</span>
              <span className="text-xs text-ink-muted block">
                {takenCount === doses.length && doses.length > 0
                  ? "All routine doses completed"
                  : `${doses.length - takenCount} doses remaining`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* "Up Next" Highlighted Dose Card */}
      {nextPendingDose && canEdit && (
        <Card variant="feature" className="p-6 sm:p-8 space-y-4 lift">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-primary-strong">
              Up Next
            </span>
            <span className="text-sm font-bold text-ink flex items-center gap-1">
              <Clock className="w-4 h-4 text-primary" aria-hidden="true" />
              <span>Scheduled for today</span>
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-3xl font-black text-ink font-display">
                {typeof nextPendingDose.medicine === "object" && nextPendingDose.medicine !== null
                  ? (nextPendingDose.medicine as Medicine).name
                  : "Medication"}
              </h3>
              <p className="text-base text-ink-muted mt-0.5">
                {typeof nextPendingDose.medicine === "object" && nextPendingDose.medicine !== null
                  ? (nextPendingDose.medicine as Medicine).strengthText
                  : ""}{" "}
                • Take with food
              </p>
            </div>

            <Button
              variant="primary"
              size="primary"
              onClick={() => void handleMarkTaken(nextPendingDose)}
              trailingIcon={<ArrowRight className="w-6 h-6" />}
              className="shadow-md"
            >
              Take Now
            </Button>
          </div>
        </Card>
      )}

      {/* Routine List */}
      {doses.length === 0 ? (
        <Card className="p-12 text-center max-w-xl mx-auto border-dashed border-2 border-line rounded-[28px] bg-surface">
          <EmptyMedicines />
          <h3 className="text-2xl font-bold text-ink mt-4 mb-2">No Doses Scheduled Today</h3>
          <p className="text-base text-ink-muted max-w-md mx-auto">
            You don&apos;t have any active medications set for today. Scan a prescription or add a
            medicine in the Medicines tab.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          <h3 className="text-2xl font-black text-ink font-display">All Doses ({doses.length})</h3>

          <div className="grid grid-cols-1 gap-4">
            {doses.map((dose) => {
              const med =
                typeof dose.medicine === "object" && dose.medicine !== null
                  ? (dose.medicine as Medicine)
                  : null;
              const isTaken = dose.status === "taken";
              const isSpilled = dose.status === "spilled";
              const isSkipped = dose.status === "skipped";

              return (
                <div
                  key={dose.id}
                  className={`p-6 rounded-[20px] border transition-all ${
                    isTaken
                      ? "bg-success-soft/30 border-success/30"
                      : isSpilled
                        ? "bg-warning-soft/30 border-warning/30"
                        : isSkipped
                          ? "bg-surface-2 border-line opacity-80"
                          : "bg-surface border-line shadow-xs hover:border-primary-strong/40"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h4 className="text-2xl font-black text-ink font-display">
                          {med ? med.name : "Medication"}
                        </h4>
                        {isTaken && <Badge variant="success">Taken</Badge>}
                        {isSpilled && <Badge variant="warning">Spilled</Badge>}
                        {isSkipped && <Badge variant="neutral">Skipped by choice</Badge>}
                      </div>

                      <p className="text-base text-ink-muted">
                        {med?.strengthText} • {med?.frequencyText}{" "}
                        {med?.withFood ? `(${med.withFood} food)` : ""}
                      </p>

                      {dose.reasonText && (
                        <p className="text-xs text-ink-muted italic">Note: {dose.reasonText}</p>
                      )}
                    </div>

                    {canEdit && (
                      <div className="flex items-center gap-3">
                        {!isTaken && (
                          <Button
                            variant="primary"
                            size="secondary"
                            onClick={() => void handleMarkTaken(dose)}
                            leadingIcon={<CheckCircle2 className="w-5 h-5" />}
                          >
                            Mark Taken
                          </Button>
                        )}

                        {!isTaken && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveDose(dose);
                              setExceptionType("skipped");
                            }}
                            className="px-4 py-2 min-h-[56px] text-sm font-bold text-ink-muted hover:text-ink rounded-full border border-line hover:bg-surface-2 transition-colors"
                          >
                            Report Issue
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Exception Modal (Spilled / Skipped) */}
      {activeDose && (
        <Modal
          isOpen={Boolean(activeDose)}
          onClose={() => setActiveDose(null)}
          title="Record Dose Issue"
          description="Log whether this dose was spilled by accident or skipped by choice"
        >
          <form onSubmit={(e) => void handleExceptionSubmit(e)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setExceptionType("skipped")}
                className={`p-4 rounded-2xl border-2 font-bold text-lg text-center transition-all ${
                  exceptionType === "skipped"
                    ? "border-primary bg-primary-soft text-primary-strong shadow-xs"
                    : "border-line bg-surface text-ink hover:bg-surface-2"
                }`}
              >
                <HelpCircle className="w-6 h-6 mx-auto mb-1 text-primary" aria-hidden="true" />
                <span>Skipped by Choice</span>
              </button>

              <button
                type="button"
                onClick={() => setExceptionType("spilled")}
                className={`p-4 rounded-2xl border-2 font-bold text-lg text-center transition-all ${
                  exceptionType === "spilled"
                    ? "border-warning bg-warning-soft text-warning shadow-xs"
                    : "border-line bg-surface text-ink hover:bg-surface-2"
                }`}
              >
                <AlertCircle className="w-6 h-6 mx-auto mb-1 text-warning" aria-hidden="true" />
                <span>Spilled / Dropped</span>
              </button>
            </div>

            <div>
              <label htmlFor="reason-text" className="block text-sm font-bold text-ink mb-1">
                Reason or Note (Optional)
              </label>
              <input
                id="reason-text"
                type="text"
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                placeholder="e.g. Mild nausea or dropped under table"
                className="w-full px-4 py-3 rounded-xl border border-line bg-surface text-ink text-base focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" size="secondary" onClick={() => setActiveDose(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="secondary" type="submit">
                Save Record
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
