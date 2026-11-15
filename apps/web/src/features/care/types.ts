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

export interface ProposedMedicine {
  name: string;
  strengthText: string;
  frequencyText: string;
  anchors: MedicineAnchor[];
  withFood: WithFoodTiming;
  instructions: string;
}

export interface ProposedUpdateMedicine extends ProposedMedicine {
  id: string;
}

export interface DiscontinuedMedicine {
  id: string;
  name: string;
  strengthText: string;
  frequencyText: string;
  anchors: MedicineAnchor[];
}

export interface PrescriptionDiff {
  added: ProposedMedicine[];
  updated: ProposedUpdateMedicine[];
  unchanged: ProposedUpdateMedicine[];
  possiblyDiscontinued: DiscontinuedMedicine[];
}

export interface PrescriptionPreviewResponse {
  diff: PrescriptionDiff;
  rawDoctorNotes: string;
  rawDateText: string | null;
}

export interface PrescriptionConfirmPayload {
  applyAdded: ProposedMedicine[];
  applyUpdated: ProposedUpdateMedicine[];
  stopDiscontinuedIds: string[];
}

export interface PrescriptionConfirmResponse {
  applied: {
    added: number;
    updated: number;
    stopped: number;
  };
}

export interface UploadAssetResponse {
  uploadId: string;
  privateUrl: string;
  fileType: string;
  bytes: number;
}

export type MetricFlag = "normal" | "low" | "high" | "unknown";

export interface ReportMetric {
  name: string;
  value: number | string;
  unit: string;
  referenceRangeText: string;
  flag: MetricFlag;
}

export interface Report {
  id: string;
  profileId: string;
  title: string;
  testDate: string;
  labName: string;
  metrics: ReportMetric[];
  fileUrl: string;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportPreviewResponse {
  preview: {
    title: string;
    testDate: string | null;
    labName: string | null;
    metrics: ReportMetric[];
    notes: string | null;
  };
  uploadId: string;
}

export interface CreateReportPayload {
  title: string;
  testDate: string;
  labName?: string;
  metrics: ReportMetric[];
  fileUrl?: string;
  notes?: string;
}

export interface MetricComparisonPoint {
  reportId: string;
  title: string;
  testDate: string;
  value: number | string;
  unit: string;
  flag: string;
}

export interface MetricComparisonResponse {
  metricName: string;
  current: MetricComparisonPoint;
  previous: MetricComparisonPoint | null;
  comparison: {
    absoluteDiff: number | null;
    percentDiff: number | null;
    daysBetween: number | null;
    neutralDiffText: string;
  };
}
