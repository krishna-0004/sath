import React, { useState } from "react";
import { Button } from "../../../components/ui/Button.js";
import { Card } from "../../../components/ui/Card.js";
import { Input } from "../../../components/ui/Input.js";
import { Label } from "../../../components/ui/Label.js";
import { Modal } from "../../../components/ui/Modal.js";
import { LoadingState } from "../../../components/ui/LoadingState.js";
import {
  useAppointments,
  useCreateAppointment,
  useDeleteAppointment,
} from "../hooks/use-care-queries.js";
import type { Profile } from "../types.js";

export interface AppointmentsViewProps {
  profile: Profile;
  canEdit: boolean;
}

export function AppointmentsView({ profile, canEdit }: AppointmentsViewProps): React.JSX.Element {
  const { data, isLoading, error } = useAppointments(profile.id);
  const createMutation = useCreateAppointment(profile.id);
  const deleteMutation = useDeleteAppointment(profile.id);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!title.trim() || !doctorName.trim() || !startsAt) {
      setFormError("Title, doctor name, and date/time are required");
      return;
    }

    try {
      await createMutation.mutateAsync({
        title: title.trim(),
        doctorName: doctorName.trim(),
        location: location.trim(),
        startsAt: new Date(startsAt).toISOString(),
        notes: notes.trim(),
      });
      setIsAddOpen(false);
      setTitle("");
      setDoctorName("");
      setLocation("");
      setStartsAt("");
      setNotes("");
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to create appointment");
    }
  };

  const handleDelete = async (aptId: string, aptTitle: string) => {
    if (window.confirm(`Delete appointment "${aptTitle}"?`)) {
      await deleteMutation.mutateAsync(aptId);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading upcoming appointments..." />;
  }

  if (error) {
    return (
      <Card className="p-8 text-center bg-red-50 border-red-200">
        <h3 className="text-xl font-bold text-red-900 mb-2">Unable to load appointments</h3>
        <p className="text-red-700">Please check your network and refresh.</p>
      </Card>
    );
  }

  const appointments = data?.appointments || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Doctor & Hospital Appointments
          </h2>
          <p className="text-stone-600 text-base mt-1">
            Keep track of upcoming clinic consultations and check-ups for {profile.elderName}.
          </p>
        </div>
        {canEdit && (
          <Button
            type="button"
            variant="primary"
            onClick={() => setIsAddOpen(true)}
            className="min-h-[50px] font-bold"
          >
            + Add Appointment
          </Button>
        )}
      </div>

      {/* Appointments List */}
      {appointments.length === 0 ? (
        <Card className="p-12 text-center max-w-xl mx-auto border-2 border-dashed border-stone-300 rounded-3xl bg-white">
          <div
            className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center text-3xl font-bold"
            aria-hidden="true"
          >
            📅
          </div>
          <h3 className="text-2xl font-bold text-stone-900 mb-2">No Appointments Scheduled</h3>
          <p className="text-stone-600 mb-6 leading-relaxed">
            Schedule doctor consultations, laboratory tests, and hospital visits.
          </p>
          {canEdit && (
            <Button
              type="button"
              variant="primary"
              onClick={() => setIsAddOpen(true)}
              className="min-h-[56px] text-lg px-8"
            >
              Add First Appointment
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {appointments.map((apt) => {
            const dateObj = new Date(apt.startsAt);
            const formattedDate = dateObj.toLocaleDateString([], {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            });
            const formattedTime = dateObj.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <Card
                key={apt.id}
                className="p-6 bg-white border border-stone-200 rounded-3xl flex flex-col justify-between shadow-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <span className="text-xs font-bold text-teal-800 uppercase tracking-wider block mb-1">
                        {formattedDate} at {formattedTime}
                      </span>
                      <h3 className="text-xl font-extrabold text-stone-950 leading-tight">
                        {apt.title}
                      </h3>
                    </div>
                  </div>

                  <p className="text-stone-800 font-bold text-base mb-1">👨‍⚕️ {apt.doctorName}</p>

                  {apt.location && <p className="text-stone-600 text-sm mb-2">📍 {apt.location}</p>}

                  {apt.notes && (
                    <p className="text-stone-500 text-xs italic bg-stone-50 p-3 rounded-xl border border-stone-100 mt-3">
                      "{apt.notes}"
                    </p>
                  )}
                </div>

                {canEdit && (
                  <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-stone-100">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleDelete(apt.id, apt.title)}
                      className="text-red-700 hover:text-red-900 text-sm font-semibold"
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Appointment Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Schedule Appointment"
        description="Add a medical checkup, hospital visit, or specialist consultation."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {formError && (
            <div role="alert" className="p-3 bg-red-50 text-red-800 text-sm rounded-xl">
              {formError}
            </div>
          )}

          <div>
            <Label htmlFor="aptTitle">Reason / Title</Label>
            <Input
              id="aptTitle"
              type="text"
              required
              placeholder="e.g. Cardiologist Follow-up"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="doctorName">Doctor / Hospital Name</Label>
            <Input
              id="doctorName"
              type="text"
              required
              placeholder="e.g. Dr. K. Sharma"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="aptLocation">Location (Clinic or Address)</Label>
            <Input
              id="aptLocation"
              type="text"
              placeholder="e.g. Apollo Clinic, 3rd Block Koramangala"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="startsAt">Date & Time</Label>
            <Input
              id="startsAt"
              type="datetime-local"
              required
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="aptNotes">Notes or Documents to carry</Label>
            <Input
              id="aptNotes"
              type="text"
              placeholder="e.g. Carry previous blood report and fasting sugar records"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Scheduling..." : "Schedule Appointment"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
