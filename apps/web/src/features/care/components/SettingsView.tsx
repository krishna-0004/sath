import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "../../../components/ui/Badge.js";
import { Button } from "../../../components/ui/Button.js";
import { Card } from "../../../components/ui/Card.js";
import { Input } from "../../../components/ui/Input.js";
import { Label } from "../../../components/ui/Label.js";
import { Modal } from "../../../components/ui/Modal.js";
import {
  useCreateDoctorContact,
  useDeleteProfile,
  useDoctorContacts,
  useMembers,
  useRemoveMember,
  useRevokeDoctorContact,
  useRotatePasscode,
  useUpdateMemberRole,
  useUpdateSharing,
} from "../hooks/use-care-queries.js";
import type { DoctorContactKind, Profile, ProfileRole } from "../types.js";

export interface SettingsViewProps {
  profile: Profile;
  isElder: boolean;
}

export function SettingsView({ profile, isElder }: SettingsViewProps): React.JSX.Element {
  const navigate = useNavigate();
  const sharingMutation = useUpdateSharing(profile.id);
  const rotateMutation = useRotatePasscode(profile.id);
  const deleteProfileMutation = useDeleteProfile();

  const { data: membersData } = useMembers(profile.id);
  const updateRoleMutation = useUpdateMemberRole(profile.id);
  const removeMemberMutation = useRemoveMember(profile.id);

  const { data: contactsData } = useDoctorContacts(profile.id, isElder);
  const createContactMutation = useCreateDoctorContact(profile.id);
  const revokeContactMutation = useRevokeDoctorContact(profile.id);

  // States
  const [sharingMedicines, setSharingMedicines] = useState(profile.sharing.medicines);
  const [sharingReports, setSharingReports] = useState(profile.sharing.reports);
  const [sharingAppointments, setSharingAppointments] = useState(profile.sharing.appointments);
  const [sharingSuccess, setSharingSuccess] = useState(false);

  // Passcode rotation
  const [newPasscode, setNewPasscode] = useState("");
  const [passcodeSuccess, setPasscodeSuccess] = useState(false);
  const [passcodeError, setPasscodeError] = useState("");

  // Doctor contact modal
  const [isAddDoctorOpen, setIsAddDoctorOpen] = useState(false);
  const [doctorKind, setDoctorKind] = useState<DoctorContactKind>("family_doctor");
  const [doctorName, setDoctorName] = useState("");
  const [doctorEmail, setDoctorEmail] = useState("");
  const [doctorPhone, setDoctorPhone] = useState("");
  const [doctorConsent, setDoctorConsent] = useState(false);
  const [doctorError, setDoctorError] = useState("");

  const handleSaveSharing = async () => {
    try {
      await sharingMutation.mutateAsync({
        medicines: sharingMedicines,
        reports: sharingReports,
        appointments: sharingAppointments,
      });
      setSharingSuccess(true);
      setTimeout(() => setSharingSuccess(false), 2500);
    } catch {
      // Error handled by query
    }
  };

  const handleRotatePasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasscodeError("");
    setPasscodeSuccess(false);

    if (newPasscode.length < 6 || newPasscode.length > 12) {
      setPasscodeError("Passcode must be between 6 and 12 characters");
      return;
    }

    try {
      await rotateMutation.mutateAsync(newPasscode);
      setNewPasscode("");
      setPasscodeSuccess(true);
      setTimeout(() => setPasscodeSuccess(false), 3000);
    } catch (err: unknown) {
      setPasscodeError(err instanceof Error ? err.message : "Failed to rotate passcode");
    }
  };

  const handleRoleChange = async (targetUserId: string, newRole: ProfileRole) => {
    try {
      await updateRoleMutation.mutateAsync({ targetUserId, role: newRole });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Could not update role");
    }
  };

  const handleRemoveMember = async (targetUserId: string, memberName: string) => {
    if (window.confirm(`Remove ${memberName} from this care circle?`)) {
      try {
        await removeMemberMutation.mutateAsync(targetUserId);
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Could not remove member");
      }
    }
  };

  const handleAddDoctorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDoctorError("");

    if (!doctorConsent) {
      setDoctorError("You must confirm explicit consent to share health reports with this doctor");
      return;
    }

    try {
      await createContactMutation.mutateAsync({
        kind: doctorKind,
        name: doctorName.trim(),
        email: doctorEmail.trim(),
        whatsappNumber: doctorPhone.trim(),
      });
      setIsAddDoctorOpen(false);
      setDoctorName("");
      setDoctorEmail("");
      setDoctorPhone("");
      setDoctorConsent(false);
    } catch (err: unknown) {
      setDoctorError(err instanceof Error ? err.message : "Failed to add doctor contact");
    }
  };

  const handleDeleteProfile = async () => {
    const confirmation = window.prompt(
      `To permanently delete this care circle and all associated medicines and records, type DELETE:`,
    );
    if (confirmation === "DELETE") {
      await deleteProfileMutation.mutateAsync(profile.id);
      navigate("/app");
    }
  };

  const members = membersData?.members || [];
  const contacts = contactsData?.contacts || [];

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
          Privacy, Permissions & Settings
        </h2>
        <p className="text-stone-600 text-base mt-1">
          Manage family sharing boundaries, rotation codes, and verified doctor contacts for{" "}
          {profile.elderName}.
        </p>
      </div>

      {/* Sharing Toggles (Elder Only) */}
      <Card className="p-6 sm:p-8 bg-white border border-stone-200 rounded-3xl shadow-xs">
        <h3 className="text-xl font-bold text-stone-900 mb-2">Family Viewer Sharing Toggles</h3>
        <p className="text-stone-600 text-sm mb-6">
          Controls which categories are visible to family members with the "Viewer" role. Elders and
          editors always have full access.
        </p>

        {isElder ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
              <input
                id="sharingMedicines"
                type="checkbox"
                checked={sharingMedicines}
                onChange={(e) => setSharingMedicines(e.target.checked)}
                className="w-5 h-5 text-teal-700 rounded-sm focus:ring-teal-700 cursor-pointer"
              />
              <div>
                <label
                  htmlFor="sharingMedicines"
                  className="font-bold text-stone-900 block cursor-pointer"
                >
                  Share Medicines & Daily Routine
                </label>
                <span className="text-stone-500 text-xs">
                  Allow viewers to view active medications and adherence.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
              <input
                id="sharingReports"
                type="checkbox"
                checked={sharingReports}
                onChange={(e) => setSharingReports(e.target.checked)}
                className="w-5 h-5 text-teal-700 rounded-sm focus:ring-teal-700 cursor-pointer"
              />
              <div>
                <label
                  htmlFor="sharingReports"
                  className="font-bold text-stone-900 block cursor-pointer"
                >
                  Share Health Documents & Reports
                </label>
                <span className="text-stone-500 text-xs">
                  Allow viewers to browse scanned blood tests and summaries.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
              <input
                id="sharingAppointments"
                type="checkbox"
                checked={sharingAppointments}
                onChange={(e) => setSharingAppointments(e.target.checked)}
                className="w-5 h-5 text-teal-700 rounded-sm focus:ring-teal-700 cursor-pointer"
              />
              <div>
                <label
                  htmlFor="sharingAppointments"
                  className="font-bold text-stone-900 block cursor-pointer"
                >
                  Share Doctor Appointments
                </label>
                <span className="text-stone-500 text-xs">
                  Allow viewers to see upcoming clinic and hospital visits.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <Button
                type="button"
                variant="primary"
                onClick={handleSaveSharing}
                disabled={sharingMutation.isPending}
              >
                {sharingMutation.isPending ? "Saving..." : "Save Sharing Settings"}
              </Button>
              {sharingSuccess && (
                <span className="text-teal-800 font-bold text-sm">
                  ✓ Settings saved successfully
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-stone-700 text-sm">
            <p>Medicines: {profile.sharing.medicines ? "Shared" : "Hidden from viewers"}</p>
            <p>Reports: {profile.sharing.reports ? "Shared" : "Hidden from viewers"}</p>
            <p>Appointments: {profile.sharing.appointments ? "Shared" : "Hidden from viewers"}</p>
          </div>
        )}
      </Card>

      {/* Passcode Rotation (Elder Only) */}
      {isElder && (
        <Card className="p-6 sm:p-8 bg-white border border-stone-200 rounded-3xl shadow-xs">
          <h3 className="text-xl font-bold text-stone-900 mb-2">Rotate Circle Passcode</h3>
          <p className="text-stone-600 text-sm mb-4">
            If you suspect someone unauthorized has your passcode, rotate it. Existing members
            remain active; future joiners will need the new passcode.
          </p>

          <form onSubmit={handleRotatePasscode} className="space-y-4 max-w-md">
            {passcodeError && (
              <div role="alert" className="p-3 bg-red-50 text-red-800 text-sm rounded-xl">
                {passcodeError}
              </div>
            )}
            {passcodeSuccess && (
              <div
                role="status"
                className="p-3 bg-teal-50 text-teal-900 text-sm font-bold rounded-xl"
              >
                ✓ Passcode rotated successfully
              </div>
            )}

            <div>
              <Label htmlFor="newPasscode">New Passcode (6–12 Characters)</Label>
              <Input
                id="newPasscode"
                type="password"
                required
                placeholder="Enter new secret passcode"
                value={newPasscode}
                onChange={(e) => setNewPasscode(e.target.value)}
              />
            </div>

            <Button type="submit" variant="secondary" disabled={rotateMutation.isPending}>
              {rotateMutation.isPending ? "Rotating..." : "Update Passcode"}
            </Button>
          </form>
        </Card>
      )}

      {/* Circle Members Management (Elder Only) */}
      {isElder && (
        <Card className="p-6 sm:p-8 bg-white border border-stone-200 rounded-3xl shadow-xs">
          <h3 className="text-xl font-bold text-stone-900 mb-2">Member Roles & Access</h3>
          <p className="text-stone-600 text-sm mb-4">
            Elders own the circle. Editors can log doses and manage medicines. Viewers can only view
            shared items.
          </p>

          <div className="space-y-3">
            {members.map((member) => {
              const isOwner = member.role === "elder";
              return (
                <div
                  key={member.id}
                  className="p-4 bg-stone-50 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div>
                    <h4 className="font-bold text-stone-900">{member.userId.name || "Member"}</h4>
                    <p className="text-stone-500 text-xs">{member.userId.email}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    {isOwner ? (
                      <Badge variant="primary">Elder (Owner)</Badge>
                    ) : (
                      <>
                        <select
                          aria-label={`Role for ${member.userId.name || "Member"}`}
                          value={member.role}
                          onChange={(e) =>
                            handleRoleChange(member.userId.id, e.target.value as ProfileRole)
                          }
                          className="px-3 py-1.5 rounded-xl border border-stone-300 text-sm font-semibold bg-white"
                        >
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                        </select>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() =>
                            handleRemoveMember(member.userId.id, member.userId.name || "Member")
                          }
                          className="text-red-700 hover:text-red-900 text-xs font-bold"
                        >
                          Remove
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Doctor Contacts (Elder Only) */}
      {isElder && (
        <Card className="p-6 sm:p-8 bg-white border border-stone-200 rounded-3xl shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-stone-900">Doctor Contacts</h3>
              <p className="text-stone-600 text-sm">
                Verified physicians receiving health summaries or emergency notifications with
                recorded consent.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAddDoctorOpen(true)}
              className="text-sm font-bold"
            >
              + Add Doctor
            </Button>
          </div>

          {contacts.length === 0 ? (
            <p className="text-stone-500 text-sm italic">No doctor contacts registered.</p>
          ) : (
            <div className="space-y-3">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="p-4 bg-stone-50 rounded-2xl flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-bold text-teal-800 uppercase tracking-wider block">
                      {contact.kind === "family_doctor" ? "Family Physician" : "Emergency Doctor"}
                    </span>
                    <h4 className="font-bold text-stone-900">{contact.name}</h4>
                    <p className="text-stone-500 text-xs">
                      {contact.email} • {contact.whatsappNumber}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => revokeContactMutation.mutate(contact.id)}
                    className="text-red-700 hover:text-red-900 text-xs font-bold"
                  >
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Danger Zone (Elder Only) */}
      {isElder && (
        <Card className="p-6 sm:p-8 bg-red-50 border-2 border-red-200 rounded-3xl">
          <h3 className="text-xl font-bold text-red-900 mb-2">Delete Care Circle</h3>
          <p className="text-red-700 text-sm mb-4 leading-relaxed">
            Permanently deletes {profile.elderName}'s profile and all associated medications, doses,
            appointments, and member connections. This action cannot be undone.
          </p>
          <Button
            type="button"
            variant="ghost"
            onClick={handleDeleteProfile}
            className="bg-red-700 hover:bg-red-800 text-white font-bold px-6 py-3 rounded-2xl"
          >
            Permanently Delete Profile
          </Button>
        </Card>
      )}

      {/* Add Doctor Modal */}
      <Modal
        isOpen={isAddDoctorOpen}
        onClose={() => setIsAddDoctorOpen(false)}
        title="Add Doctor Contact"
        description="Register a doctor contact. Medical documents will only be shared with verified consent."
      >
        <form onSubmit={handleAddDoctorSubmit} className="space-y-4">
          {doctorError && (
            <div role="alert" className="p-3 bg-red-50 text-red-800 text-sm rounded-xl">
              {doctorError}
            </div>
          )}

          <div>
            <Label htmlFor="docKind">Doctor Type</Label>
            <select
              id="docKind"
              value={doctorKind}
              onChange={(e) => setDoctorKind(e.target.value as DoctorContactKind)}
              className="w-full px-4 py-3 rounded-xl border border-stone-300 text-stone-900 focus:outline-none focus:ring-4 focus:ring-teal-700/30"
            >
              <option value="family_doctor">Family Doctor (Routine reports)</option>
              <option value="emergency_doctor">Emergency Doctor (SOS alerts)</option>
            </select>
          </div>

          <div>
            <Label htmlFor="docName">Doctor Name</Label>
            <Input
              id="docName"
              type="text"
              required
              placeholder="e.g. Dr. K. Sharma"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="docEmail">Doctor Email Address</Label>
            <Input
              id="docEmail"
              type="email"
              required
              placeholder="doctor@clinic.com"
              value={doctorEmail}
              onChange={(e) => setDoctorEmail(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="docPhone">WhatsApp / Mobile Number</Label>
            <Input
              id="docPhone"
              type="tel"
              required
              placeholder="+91 98765 43210"
              value={doctorPhone}
              onChange={(e) => setDoctorPhone(e.target.value)}
            />
          </div>

          <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200 mt-2">
            <input
              id="doctorConsent"
              type="checkbox"
              required
              checked={doctorConsent}
              onChange={(e) => setDoctorConsent(e.target.checked)}
              className="mt-1 w-5 h-5 text-teal-700 rounded-sm focus:ring-teal-700 cursor-pointer"
            />
            <label
              htmlFor="doctorConsent"
              className="text-stone-800 text-xs font-semibold leading-relaxed cursor-pointer"
            >
              I certify that {profile.elderName} (or their legal representative) explicitly consents
              to recording this doctor contact for routine health summaries or emergency
              notifications.
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsAddDoctorOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={createContactMutation.isPending}>
              {createContactMutation.isPending ? "Adding..." : "Register Doctor"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
