import React, { useState } from "react";
import { Badge } from "../../../components/ui/Badge.js";
import { Button } from "../../../components/ui/Button.js";
import { Card } from "../../../components/ui/Card.js";
import { Modal } from "../../../components/ui/Modal.js";
import { LoadingState } from "../../../components/ui/LoadingState.js";
import { useRecordDose, useTodayDoses } from "../hooks/use-care-queries.js";
import type { DoseEvent, DoseStatus, Medicine, Profile } from "../types.js";

export interface TodayViewProps {
  profile: Profile;
  canEdit: boolean;
}

export function TodayView({ profile, canEdit }: TodayViewProps): React.JSX.Element {
  const { data, isLoading, error } = useTodayDoses(profile.id);
  const recordMutation = useRecordDose(profile.id);

  // Screen reader receipt announcement
  const [receiptMessage, setReceiptMessage] = useState("");

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
      <Card className="p-8 text-center bg-red-50 border-red-200">
        <h3 className="text-xl font-bold text-red-900 mb-2">Unable to load today's routine</h3>
        <p className="text-red-700">Please check your connection and refresh.</p>
      </Card>
    );
  }

  const doses = data?.doses || [];

  return (
    <div className="space-y-6">
      {/* Live Region for Screen Readers */}
      <div role="status" aria-live="polite" className="sr-only">
        {receiptMessage}
      </div>

      {/* Visual notification receipt if message exists */}
      {receiptMessage && (
        <div
          role="status"
          className="p-4 bg-teal-50 border-2 border-teal-600 rounded-2xl text-teal-950 font-bold text-lg flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="text-2xl">
              ✓
            </span>
            <span>{receiptMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setReceiptMessage("")}
            className="text-teal-800 hover:text-teal-950 font-bold px-2 py-1"
            aria-label="Dismiss confirmation"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header & Date */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-950 tracking-tight">
            Today's Routine for {profile.elderName}
          </h2>
          <p className="text-stone-600 text-lg">
            Timezone: <span className="font-semibold">{profile.timezone}</span>
          </p>
        </div>
      </div>

      {/* Routine list */}
      {doses.length === 0 ? (
        <Card className="p-12 text-center max-w-xl mx-auto border-2 border-dashed border-stone-300 rounded-3xl bg-white">
          <div
            className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center text-3xl font-bold"
            aria-hidden="true"
          >
            ✓
          </div>
          <h3 className="text-2xl font-bold text-stone-900 mb-2">No Medicines Scheduled Today</h3>
          <p className="text-stone-600 text-lg">
            Add active medicines with daily anchors in the Medicines tab to build the daily
            schedule.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {doses.map((dose) => {
            const med =
              typeof dose.medicine === "object" && dose.medicine !== null
                ? (dose.medicine as Medicine)
                : null;
            const medName = med?.name || "Medication";
            const strength = med?.strengthText || "";
            const withFood = med?.withFood ? `Take ${med.withFood} food` : "";
            const scheduledTime = new Date(dose.scheduledFor).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });

            const isTaken = dose.status === "taken";
            const isSpilled = dose.status === "spilled";
            const isSkipped = dose.status === "skipped";
            const isMissed = dose.displayStatus === "missed";

            return (
              <Card
                key={dose.id}
                className={`p-6 sm:p-8 rounded-3xl border-2 transition-all ${
                  isTaken
                    ? "bg-teal-50/50 border-teal-300"
                    : isMissed
                      ? "bg-amber-50/60 border-amber-300"
                      : "bg-white border-stone-200"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Medicine Details */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xl sm:text-2xl font-extrabold text-stone-950">
                        {scheduledTime}
                      </span>
                      {isTaken && (
                        <Badge variant="primary" className="text-base px-3 py-1">
                          ✓ Taken
                        </Badge>
                      )}
                      {isMissed && (
                        <Badge
                          variant="neutral"
                          className="text-base px-3 py-1 bg-amber-200 text-amber-950 font-bold"
                        >
                          ⏰ Past Due
                        </Badge>
                      )}
                      {isSpilled && (
                        <Badge
                          variant="neutral"
                          className="text-base px-3 py-1 bg-stone-200 text-stone-800"
                        >
                          Spilled
                        </Badge>
                      )}
                      {isSkipped && (
                        <Badge
                          variant="neutral"
                          className="text-base px-3 py-1 bg-stone-200 text-stone-800"
                        >
                          Skipped by choice
                        </Badge>
                      )}
                    </div>

                    <h3 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
                      {medName}{" "}
                      <span className="text-stone-500 font-medium text-xl">{strength}</span>
                    </h3>

                    {withFood && (
                      <p className="text-stone-700 font-semibold text-lg flex items-center gap-2">
                        <span aria-hidden="true">🍽️</span> {withFood}
                      </p>
                    )}

                    {dose.reasonText && (
                      <p className="text-stone-600 text-base italic">Note: "{dose.reasonText}"</p>
                    )}
                  </div>

                  {/* Actions for Elder/Editor */}
                  {canEdit && (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                      {!isTaken ? (
                        <>
                          <Button
                            type="button"
                            variant="primary"
                            onClick={() => handleMarkTaken(dose)}
                            disabled={recordMutation.isPending}
                            className="min-h-[76px] px-8 text-xl font-extrabold bg-teal-800 hover:bg-teal-900 text-white rounded-2xl shadow-md flex items-center justify-center gap-3 focus:ring-4 focus:ring-teal-700/40"
                          >
                            <span aria-hidden="true" className="text-2xl">
                              ✓
                            </span>
                            Mark Taken
                          </Button>

                          <div className="flex sm:flex-col gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => {
                                setActiveDose(dose);
                                setExceptionType("skipped");
                              }}
                              className="min-h-[44px] flex-1 text-sm font-semibold"
                            >
                              Skip
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => {
                                setActiveDose(dose);
                                setExceptionType("spilled");
                              }}
                              className="min-h-[44px] flex-1 text-sm font-semibold text-stone-600"
                            >
                              Spilled
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 text-teal-800 font-bold text-lg p-3 bg-teal-100 rounded-2xl">
                          <span aria-hidden="true" className="text-xl">
                            ✓
                          </span>
                          <span>Confirmed Taken</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Exception Reason Modal */}
      <Modal
        isOpen={Boolean(activeDose)}
        onClose={() => setActiveDose(null)}
        title={exceptionType === "skipped" ? "Skip Dose by Choice" : "Record Spilled Dose"}
        description={
          exceptionType === "skipped"
            ? "Conscious decisions to skip do not penalize adherence. You may record an optional reason."
            : "Record if the tablet was dropped, spilled, or damaged."
        }
      >
        <form onSubmit={handleExceptionSubmit} className="space-y-4">
          <div>
            <label htmlFor="reason" className="block text-stone-900 font-semibold mb-2">
              Reason (Optional)
            </label>
            <input
              id="reason"
              type="text"
              placeholder="e.g. Mild stomach discomfort, fasting, etc."
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-stone-300 text-stone-900 focus:outline-none focus:ring-4 focus:ring-teal-700/30"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setActiveDose(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={recordMutation.isPending}>
              Confirm
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
