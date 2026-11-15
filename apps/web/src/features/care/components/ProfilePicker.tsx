import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "../../../components/ui/Badge.js";
import { Button } from "../../../components/ui/Button.js";
import { Card } from "../../../components/ui/Card.js";
import { Input } from "../../../components/ui/Input.js";
import { Label } from "../../../components/ui/Label.js";
import { Modal } from "../../../components/ui/Modal.js";
import { LoadingState } from "../../../components/ui/LoadingState.js";
import { useCreateProfile, useJoinProfile, useProfiles } from "../hooks/use-care-queries.js";

export function ProfilePicker(): React.JSX.Element {
  const navigate = useNavigate();
  const { data, isLoading, error } = useProfiles();
  const createMutation = useCreateProfile();
  const joinMutation = useJoinProfile();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);

  // Form states
  const [elderName, setElderName] = useState("");
  const [createPasscode, setCreatePasscode] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [createError, setCreateError] = useState("");

  const [joinCode, setJoinCode] = useState("");
  const [joinPasscode, setJoinPasscode] = useState("");
  const [joinError, setJoinError] = useState("");

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");

    if (!elderName.trim()) {
      setCreateError("Elder name is required");
      return;
    }
    if (createPasscode.length < 6 || createPasscode.length > 12) {
      setCreateError("Passcode must be between 6 and 12 characters");
      return;
    }

    try {
      const res = await createMutation.mutateAsync({
        elderName: elderName.trim(),
        passcode: createPasscode.trim(),
        emergencyPhone: emergencyPhone.trim() || null,
      });
      setIsCreateOpen(false);
      setElderName("");
      setCreatePasscode("");
      setEmergencyPhone("");
      navigate(`/p/${res.profile.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create profile";
      setCreateError(msg);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError("");

    if (!joinCode.trim()) {
      setJoinError("Join code is required");
      return;
    }
    if (!joinPasscode.trim()) {
      setJoinError("Passcode is required");
      return;
    }

    try {
      const res = await joinMutation.mutateAsync({
        joinCode: joinCode.trim().toUpperCase(),
        passcode: joinPasscode.trim(),
      });
      setIsJoinOpen(false);
      setJoinCode("");
      setJoinPasscode("");
      navigate(`/p/${res.profile.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid join code or passcode";
      setJoinError(msg);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading your care profiles..." />;
  }

  if (error) {
    return (
      <Card className="p-8 text-center max-w-lg mx-auto bg-red-50 border-red-200">
        <h2 className="text-xl font-bold text-red-900 mb-2">Could not load profiles</h2>
        <p className="text-red-700">Please refresh the page to try again.</p>
      </Card>
    );
  }

  const profiles = data?.profiles || [];

  return (
    <div className="space-y-8">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Care Circles
          </h2>
          <p className="text-stone-600 text-base mt-1">
            Select an elder to view medication schedules, health reports, and appointments.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsJoinOpen(true)}
            className="flex-1 sm:flex-none"
          >
            Join with Code
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => setIsCreateOpen(true)}
            className="flex-1 sm:flex-none"
          >
            + Create Profile
          </Button>
        </div>
      </div>

      {/* Profiles list */}
      {profiles.length === 0 ? (
        <Card className="p-12 text-center max-w-xl mx-auto border-2 border-dashed border-stone-300 rounded-3xl bg-white">
          <div
            className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center text-3xl font-bold"
            aria-hidden="true"
          >
            🏠
          </div>
          <h3 className="text-2xl font-bold text-stone-900 mb-2">No Profiles Yet</h3>
          <p className="text-stone-600 mb-6 leading-relaxed">
            Create a profile for your elder to start organizing medication anchors, or join an
            existing family circle using an invitation code.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Button
              type="button"
              variant="primary"
              onClick={() => setIsCreateOpen(true)}
              className="min-h-[56px] text-lg px-8"
            >
              Create Elder Profile
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsJoinOpen(true)}
              className="min-h-[56px] text-lg px-8"
            >
              Join with Code
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles.map(({ profile, role }) => (
            <Card
              key={profile.id}
              className="bg-white border-2 border-stone-200 hover:border-teal-700 transition-colors p-6 rounded-3xl shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-12 w-12 rounded-2xl bg-teal-700 text-white flex items-center justify-center font-bold text-xl"
                      aria-hidden="true"
                    >
                      {profile.elderName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-stone-950 leading-tight">
                        {profile.elderName}
                      </h3>
                      <p className="text-stone-500 text-sm">Zone: {profile.timezone}</p>
                    </div>
                  </div>
                  <Badge variant={role === "elder" ? "primary" : "neutral"}>
                    {role === "elder" ? "Elder (Owner)" : role === "editor" ? "Editor" : "Viewer"}
                  </Badge>
                </div>

                {role === "elder" && (
                  <div className="mb-6 p-3 bg-stone-50 rounded-xl border border-stone-200">
                    <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                      Join Code
                    </span>
                    <span className="font-mono text-base font-bold text-teal-900 tracking-wider">
                      {profile.joinCode}
                    </span>
                  </div>
                )}
              </div>

              <Button
                type="button"
                variant="primary"
                onClick={() => navigate(`/p/${profile.id}`)}
                className="w-full mt-4 min-h-[56px] text-lg font-bold"
              >
                Open Care Hub →
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* Modal: Create Profile */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Elder Profile"
        description="Set up medication reminders and an emergency circle for your elder."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-5">
          {createError && (
            <div role="alert" className="p-3 bg-red-50 text-red-800 text-sm rounded-xl">
              {createError}
            </div>
          )}

          <div>
            <Label htmlFor="elderName">Elder Full Name</Label>
            <Input
              id="elderName"
              type="text"
              required
              placeholder="e.g. Grandpa Ramesh"
              value={elderName}
              onChange={(e) => setElderName(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="createPasscode">Passcode (6–12 characters)</Label>
            <Input
              id="createPasscode"
              type="password"
              required
              placeholder="Enter 6 to 12 characters"
              value={createPasscode}
              onChange={(e) => setCreatePasscode(e.target.value)}
            />
            <p className="text-stone-500 text-xs mt-1">
              Family members will enter this passcode along with your join code to enter the circle.
            </p>
          </div>

          <div>
            <Label htmlFor="emergencyPhone">Emergency Contact Phone (Optional)</Label>
            <Input
              id="emergencyPhone"
              type="tel"
              placeholder="+91 98765 43210"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Profile"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Join Profile */}
      <Modal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        title="Join Family Circle"
        description="Enter the 10-character code and passcode provided by the elder or family owner."
      >
        <form onSubmit={handleJoinSubmit} className="space-y-5">
          {joinError && (
            <div role="alert" className="p-3 bg-red-50 text-red-800 text-sm rounded-xl">
              {joinError}
            </div>
          )}

          <div>
            <Label htmlFor="joinCode">Join Code (10 Characters)</Label>
            <Input
              id="joinCode"
              type="text"
              required
              placeholder="e.g. 234ABC99XYZ"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              className="font-mono uppercase tracking-wider"
            />
          </div>

          <div>
            <Label htmlFor="joinPasscode">Passcode</Label>
            <Input
              id="joinPasscode"
              type="password"
              required
              placeholder="Enter circle passcode"
              value={joinPasscode}
              onChange={(e) => setJoinPasscode(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsJoinOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={joinMutation.isPending}>
              {joinMutation.isPending ? "Joining..." : "Join Circle"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
