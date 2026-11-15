import React, { useState } from "react";
import { Badge } from "../../../components/ui/Badge.js";
import { Button } from "../../../components/ui/Button.js";
import { Card } from "../../../components/ui/Card.js";
import { Input } from "../../../components/ui/Input.js";
import { Label } from "../../../components/ui/Label.js";
import { Modal } from "../../../components/ui/Modal.js";
import { LoadingState } from "../../../components/ui/LoadingState.js";
import { useCreateMedicine, useMedicines, useStopMedicine } from "../hooks/use-care-queries.js";
import type { MedicineAnchor, Profile } from "../types.js";

export interface MedicinesViewProps {
  profile: Profile;
  canEdit: boolean;
}

const ALL_ANCHORS: Array<{ id: MedicineAnchor; label: string }> = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
  { id: "bedtime", label: "Bedtime" },
];

export function MedicinesView({ profile, canEdit }: MedicinesViewProps): React.JSX.Element {
  const { data, isLoading, error } = useMedicines(profile.id);
  const createMutation = useCreateMedicine(profile.id);
  const stopMutation = useStopMedicine(profile.id);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [strengthText, setStrengthText] = useState("");
  const [frequencyText, setFrequencyText] = useState("");
  const [selectedAnchors, setSelectedAnchors] = useState<MedicineAnchor[]>(["breakfast"]);
  const [withFood, setWithFood] = useState<string>("after");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");

  const handleAnchorToggle = (anchor: MedicineAnchor) => {
    if (selectedAnchors.includes(anchor)) {
      if (selectedAnchors.length === 1) return; // Keep at least one
      setSelectedAnchors(selectedAnchors.filter((a) => a !== anchor));
    } else {
      setSelectedAnchors([...selectedAnchors, anchor]);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!name.trim()) {
      setFormError("Medicine name is required");
      return;
    }
    if (!strengthText.trim()) {
      setFormError("Strength is required (e.g. 500 mg)");
      return;
    }
    if (!frequencyText.trim()) {
      setFormError("Frequency text is required (e.g. Daily)");
      return;
    }
    if (selectedAnchors.length === 0) {
      setFormError("Select at least one daily anchor time");
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        strengthText: strengthText.trim(),
        frequencyText: frequencyText.trim(),
        anchors: selectedAnchors,
        withFood: withFood || null,
        notes: notes.trim(),
      });
      setIsAddOpen(false);
      setName("");
      setStrengthText("");
      setFrequencyText("");
      setSelectedAnchors(["breakfast"]);
      setWithFood("after");
      setNotes("");
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to add medicine");
    }
  };

  const handleStop = async (medicineId: string, medName: string) => {
    if (window.confirm(`Stop routine for ${medName}? This will discontinue future doses.`)) {
      await stopMutation.mutateAsync(medicineId);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading medications list..." />;
  }

  if (error) {
    return (
      <Card className="p-8 text-center bg-red-50 border-red-200">
        <h3 className="text-xl font-bold text-red-900 mb-2">Unable to load medicines</h3>
        <p className="text-red-700">Please check your network and refresh.</p>
      </Card>
    );
  }

  const medicines = data?.medicines || [];
  const activeMeds = medicines.filter((m) => m.status === "active");
  const stoppedMeds = medicines.filter((m) => m.status === "stopped");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Prescriptions & Medicines
          </h2>
          <p className="text-stone-600 text-base mt-1">
            Active and discontinued medicines for {profile.elderName}.
          </p>
        </div>
        {canEdit && (
          <Button
            type="button"
            variant="primary"
            onClick={() => setIsAddOpen(true)}
            className="min-h-[50px] font-bold"
          >
            + Add Medicine
          </Button>
        )}
      </div>

      {/* Active Medicines Section */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-stone-900">Active Medicines ({activeMeds.length})</h3>

        {activeMeds.length === 0 ? (
          <Card className="p-8 text-center border-dashed border-stone-300 rounded-3xl bg-white">
            <p className="text-stone-600 text-base">No active medicines found.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeMeds.map((med) => (
              <Card
                key={med.id}
                className="p-6 bg-white border border-stone-200 rounded-3xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="text-xl font-extrabold text-stone-900 leading-tight">
                      {med.name}
                    </h4>
                    <Badge variant="primary">{med.strengthText}</Badge>
                  </div>

                  <p className="text-stone-600 text-sm font-semibold mb-2">{med.frequencyText}</p>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {med.anchors.map((anchor) => (
                      <span
                        key={anchor}
                        className="text-xs px-2.5 py-1 bg-stone-100 text-stone-700 font-bold rounded-lg capitalize"
                      >
                        {anchor}
                      </span>
                    ))}
                  </div>

                  {med.withFood && (
                    <p className="text-stone-700 text-sm font-medium">
                      🍽️ Take {med.withFood} food
                    </p>
                  )}

                  {med.notes && <p className="text-stone-500 text-xs italic mt-2">"{med.notes}"</p>}
                </div>

                {canEdit && (
                  <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-stone-100">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleStop(med.id, med.name)}
                      className="text-red-700 hover:text-red-900 text-sm font-semibold"
                    >
                      Stop Medicine
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Discontinued Medicines */}
      {stoppedMeds.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-stone-200">
          <h3 className="text-xl font-bold text-stone-500">
            Discontinued Medicines ({stoppedMeds.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-70">
            {stoppedMeds.map((med) => (
              <Card key={med.id} className="p-5 bg-stone-50 border border-stone-200 rounded-2xl">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-stone-800 line-through">{med.name}</h4>
                  <Badge variant="neutral">Discontinued</Badge>
                </div>
                <p className="text-stone-500 text-sm">
                  {med.strengthText} — {med.frequencyText}
                </p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Add Medicine Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Prescribed Medicine"
        description="Schedule a new daily medicine with anchor meal times."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {formError && (
            <div role="alert" className="p-3 bg-red-50 text-red-800 text-sm rounded-xl">
              {formError}
            </div>
          )}

          <div>
            <Label htmlFor="medName">Medicine Name</Label>
            <Input
              id="medName"
              type="text"
              required
              placeholder="e.g. Metformin"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="medStrength">Strength / Dosage</Label>
              <Input
                id="medStrength"
                type="text"
                required
                placeholder="e.g. 500 mg, 1 tablet"
                value={strengthText}
                onChange={(e) => setStrengthText(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="medFrequency">Frequency Description</Label>
              <Input
                id="medFrequency"
                type="text"
                required
                placeholder="e.g. Twice daily"
                value={frequencyText}
                onChange={(e) => setFrequencyText(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Daily Routine Anchors</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {ALL_ANCHORS.map((anchor) => {
                const isChecked = selectedAnchors.includes(anchor.id);
                return (
                  <button
                    key={anchor.id}
                    type="button"
                    onClick={() => handleAnchorToggle(anchor.id)}
                    className={`p-3 rounded-xl border text-sm font-bold flex items-center justify-between transition-colors ${
                      isChecked
                        ? "bg-teal-50 border-teal-700 text-teal-900"
                        : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                    }`}
                  >
                    <span>{anchor.label}</span>
                    <span>{isChecked ? "✓" : "+"}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label htmlFor="withFood">Food Timing</Label>
            <select
              id="withFood"
              value={withFood}
              onChange={(e) => setWithFood(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-stone-300 text-stone-900 focus:outline-none focus:ring-4 focus:ring-teal-700/30"
            >
              <option value="after">Take after meal</option>
              <option value="before">Take before meal</option>
              <option value="with">Take with meal</option>
              <option value="">No food requirement</option>
            </select>
          </div>

          <div>
            <Label htmlFor="medNotes">Special Instructions (Optional)</Label>
            <Input
              id="medNotes"
              type="text"
              placeholder="e.g. Drink full glass of water"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Adding..." : "Add Medicine"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
