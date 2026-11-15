export type ProfileRole = "elder" | "editor" | "viewer";

export interface Profile {
  id: string;
  elderName: string;
  joinCode: string;
  timezone: string;
  anchorTimes: {
    breakfast: string;
    lunch: string;
    dinner: string;
    bedtime: string;
  };
  sharing: {
    medicines: boolean;
    reports: boolean;
    appointments: boolean;
  };
  emergencyPhone?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileMembership {
  id: string;
  profileId: string;
  userId: string;
  role: ProfileRole;
  status: "active" | "revoked";
  joinedAt: string;
}

export interface ProfileSummaryItem {
  profile: Profile;
  role: ProfileRole;
  joinedAt: string;
}

export type MedicineAnchor = "breakfast" | "lunch" | "dinner" | "bedtime";
export type WithFoodTiming = "before" | "after" | "with" | null;
export type MedicineStatus = "active" | "stopped";

export interface Medicine {
  id: string;
  profileId: string;
  name: string;
  strengthText: string;
  frequencyText: string;
  anchors: MedicineAnchor[];
  withFood: WithFoodTiming;
  notes: string;
  status: MedicineStatus;
  source: "manual" | "scan";
  createdAt: string;
  updatedAt: string;
}

export type DoseStatus = "pending" | "taken" | "spilled" | "skipped";
export type DoseDisplayStatus = "pending" | "due" | "missed" | "taken" | "spilled" | "skipped";

export interface DoseEvent {
  id: string;
  profileId: string;
  medicine: Medicine | string;
  scheduledFor: string;
  status: DoseStatus;
  displayStatus: DoseDisplayStatus;
  reasonText: string;
  recordedBy: string | null;
  recordedAt: string | null;
}

export interface DoseSummary {
  days: number;
  total: number;
  taken: number;
  spilled: number;
  skipped: number;
  missed: number;
  pending: number;
  adherenceRate: number;
}

export interface Appointment {
  id: string;
  profileId: string;
  title: string;
  doctorName: string;
  location: string;
  startsAt: string;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type DoctorContactKind = "family_doctor" | "emergency_doctor";

export interface DoctorContact {
  id: string;
  profileId: string;
  kind: DoctorContactKind;
  name: string;
  email: string;
  whatsappNumber: string;
  consentRecordedAt: string;
  consentBy: string;
  revokedAt: string | null;
}

export interface ProfileMemberItem {
  id: string;
  profileId: string;
  userId: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  role: ProfileRole;
  joinedAt: string;
}
