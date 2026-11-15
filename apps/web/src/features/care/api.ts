import { apiRequest } from "../../lib/api-client.js";
import type {
  Appointment,
  CreateReportPayload,
  DoctorContact,
  DoctorContactKind,
  DoseEvent,
  DoseStatus,
  DoseSummary,
  Medicine,
  MetricComparisonResponse,
  PrescriptionConfirmPayload,
  PrescriptionConfirmResponse,
  PrescriptionPreviewResponse,
  Profile,
  ProfileMemberItem,
  ProfileMembership,
  ProfileRole,
  ProfileSummaryItem,
  Report,
  ReportPreviewResponse,
} from "./types.js";

export const careApi = {
  // Profiles
  async getProfiles(): Promise<{ profiles: ProfileSummaryItem[] }> {
    return apiRequest<{ profiles: ProfileSummaryItem[] }>("/profiles");
  },

  async createProfile(data: {
    elderName: string;
    passcode: string;
    timezone?: string;
    emergencyPhone?: string | null;
  }): Promise<{ profile: Profile; membership: ProfileMembership }> {
    return apiRequest<{ profile: Profile; membership: ProfileMembership }>("/profiles", {
      method: "POST",
      body: data,
    });
  },

  async joinProfile(data: {
    joinCode: string;
    passcode: string;
  }): Promise<{ profile: Profile; membership: ProfileMembership; alreadyMember: boolean }> {
    return apiRequest<{ profile: Profile; membership: ProfileMembership; alreadyMember: boolean }>(
      "/profiles/join",
      {
        method: "POST",
        body: data,
      },
    );
  },

  async getProfile(profileId: string): Promise<{ profile: Profile; role: ProfileRole }> {
    return apiRequest<{ profile: Profile; role: ProfileRole }>(`/profiles/${profileId}`);
  },

  async updateProfile(
    profileId: string,
    data: { elderName?: string; timezone?: string; emergencyPhone?: string | null },
  ): Promise<{ profile: Profile }> {
    return apiRequest<{ profile: Profile }>(`/profiles/${profileId}`, {
      method: "PATCH",
      body: data,
    });
  },

  async rotatePasscode(profileId: string, passcode: string): Promise<void> {
    return apiRequest<void>(`/profiles/${profileId}/rotate-passcode`, {
      method: "POST",
      body: { passcode },
    });
  },

  async updateSharing(
    profileId: string,
    sharing: { medicines?: boolean; reports?: boolean; appointments?: boolean },
  ): Promise<{ sharing: Profile["sharing"] }> {
    return apiRequest<{ sharing: Profile["sharing"] }>(`/profiles/${profileId}/sharing`, {
      method: "PATCH",
      body: sharing,
    });
  },

  async listMembers(profileId: string): Promise<{ members: ProfileMemberItem[] }> {
    return apiRequest<{ members: ProfileMemberItem[] }>(`/profiles/${profileId}/members`);
  },

  async updateMemberRole(
    profileId: string,
    targetUserId: string,
    role: ProfileRole,
  ): Promise<{ membership: ProfileMembership }> {
    return apiRequest<{ membership: ProfileMembership }>(
      `/profiles/${profileId}/members/${targetUserId}`,
      {
        method: "PATCH",
        body: { role },
      },
    );
  },

  async removeMember(profileId: string, targetUserId: string): Promise<void> {
    return apiRequest<void>(`/profiles/${profileId}/members/${targetUserId}`, {
      method: "DELETE",
    });
  },

  async deleteProfile(profileId: string): Promise<void> {
    return apiRequest<void>(`/profiles/${profileId}`, {
      method: "DELETE",
    });
  },

  // Medicines
  async getMedicines(profileId: string): Promise<{ medicines: Medicine[] }> {
    return apiRequest<{ medicines: Medicine[] }>(`/profiles/${profileId}/medicines`);
  },

  async createMedicine(
    profileId: string,
    data: {
      name: string;
      strengthText: string;
      frequencyText: string;
      anchors: string[];
      withFood?: string | null;
      notes?: string;
    },
  ): Promise<{ medicine: Medicine }> {
    return apiRequest<{ medicine: Medicine }>(`/profiles/${profileId}/medicines`, {
      method: "POST",
      body: data,
    });
  },

  async updateMedicine(
    profileId: string,
    medicineId: string,
    data: {
      name?: string;
      strengthText?: string;
      frequencyText?: string;
      anchors?: string[];
      withFood?: string | null;
      notes?: string;
    },
  ): Promise<{ medicine: Medicine }> {
    return apiRequest<{ medicine: Medicine }>(`/profiles/${profileId}/medicines/${medicineId}`, {
      method: "PATCH",
      body: data,
    });
  },

  async stopMedicine(profileId: string, medicineId: string): Promise<{ medicine: Medicine }> {
    return apiRequest<{ medicine: Medicine }>(
      `/profiles/${profileId}/medicines/${medicineId}/stop`,
      {
        method: "POST",
      },
    );
  },

  // Doses
  async getTodayDoses(profileId: string): Promise<{ doses: DoseEvent[] }> {
    return apiRequest<{ doses: DoseEvent[] }>(`/profiles/${profileId}/doses/today`);
  },

  async recordDose(
    profileId: string,
    doseId: string,
    data: { status: DoseStatus; reasonText?: string },
  ): Promise<{ dose: DoseEvent }> {
    return apiRequest<{ dose: DoseEvent }>(`/profiles/${profileId}/doses/${doseId}`, {
      method: "PATCH",
      body: data,
    });
  },

  async getDoseSummary(profileId: string, days = 7): Promise<{ summary: DoseSummary }> {
    return apiRequest<{ summary: DoseSummary }>(
      `/profiles/${profileId}/doses/summary?days=${days}`,
    );
  },

  // Appointments
  async getAppointments(profileId: string): Promise<{ appointments: Appointment[] }> {
    return apiRequest<{ appointments: Appointment[] }>(`/profiles/${profileId}/appointments`);
  },

  async createAppointment(
    profileId: string,
    data: {
      title: string;
      doctorName: string;
      location?: string;
      startsAt: string;
      notes?: string;
    },
  ): Promise<{ appointment: Appointment }> {
    return apiRequest<{ appointment: Appointment }>(`/profiles/${profileId}/appointments`, {
      method: "POST",
      body: data,
    });
  },

  async updateAppointment(
    profileId: string,
    appointmentId: string,
    data: {
      title?: string;
      doctorName?: string;
      location?: string;
      startsAt?: string;
      notes?: string;
    },
  ): Promise<{ appointment: Appointment }> {
    return apiRequest<{ appointment: Appointment }>(
      `/profiles/${profileId}/appointments/${appointmentId}`,
      {
        method: "PATCH",
        body: data,
      },
    );
  },

  async deleteAppointment(profileId: string, appointmentId: string): Promise<void> {
    return apiRequest<void>(`/profiles/${profileId}/appointments/${appointmentId}`, {
      method: "DELETE",
    });
  },

  // Doctor Contacts
  async getDoctorContacts(profileId: string): Promise<{ contacts: DoctorContact[] }> {
    return apiRequest<{ contacts: DoctorContact[] }>(`/profiles/${profileId}/doctor-contacts`);
  },

  async createDoctorContact(
    profileId: string,
    data: {
      kind: DoctorContactKind;
      name: string;
      email: string;
      whatsappNumber: string;
    },
  ): Promise<{ contact: DoctorContact }> {
    return apiRequest<{ contact: DoctorContact }>(`/profiles/${profileId}/doctor-contacts`, {
      method: "POST",
      body: data,
    });
  },

  async revokeDoctorContact(profileId: string, contactId: string): Promise<void> {
    return apiRequest<void>(`/profiles/${profileId}/doctor-contacts/${contactId}`, {
      method: "DELETE",
    });
  },

  // Scan & Confirm
  async uploadPrescriptionOrReport(
    profileId: string,
    file: File,
  ): Promise<{ uploadId: string; privateUrl: string; fileType: string; bytes: number }> {
    const formData = new FormData();
    formData.append("file", file);
    return apiRequest<{ uploadId: string; privateUrl: string; fileType: string; bytes: number }>(
      `/profiles/${profileId}/uploads/prescription-or-report`,
      {
        method: "POST",
        body: formData as unknown as Record<string, unknown>,
      },
    );
  },

  async previewPrescription(
    profileId: string,
    uploadId: string,
  ): Promise<PrescriptionPreviewResponse> {
    return apiRequest<PrescriptionPreviewResponse>(
      `/profiles/${profileId}/scan/prescription/preview`,
      {
        method: "POST",
        body: { uploadId },
      },
    );
  },

  async confirmPrescription(
    profileId: string,
    payload: PrescriptionConfirmPayload,
  ): Promise<PrescriptionConfirmResponse> {
    return apiRequest<PrescriptionConfirmResponse>(
      `/profiles/${profileId}/scan/prescription/confirm`,
      {
        method: "POST",
        body: payload as unknown as Record<string, unknown>,
      },
    );
  },

  // Report Lens & What Changed Feed
  async previewReport(profileId: string, uploadId: string): Promise<ReportPreviewResponse> {
    return apiRequest<ReportPreviewResponse>(`/profiles/${profileId}/reports/preview`, {
      method: "POST",
      body: { uploadId },
    });
  },

  async createReport(profileId: string, payload: CreateReportPayload): Promise<{ report: Report }> {
    return apiRequest<{ report: Report }>(`/profiles/${profileId}/reports`, {
      method: "POST",
      body: payload as unknown as Record<string, unknown>,
    });
  },

  async getReports(profileId: string): Promise<{ reports: Report[] }> {
    return apiRequest<{ reports: Report[] }>(`/profiles/${profileId}/reports`);
  },

  async getReportById(profileId: string, reportId: string): Promise<{ report: Report }> {
    return apiRequest<{ report: Report }>(`/profiles/${profileId}/reports/${reportId}`);
  },

  async deleteReport(profileId: string, reportId: string): Promise<void> {
    return apiRequest<void>(`/profiles/${profileId}/reports/${reportId}`, {
      method: "DELETE",
    });
  },

  async compareReportMetric(
    profileId: string,
    metricName: string,
  ): Promise<MetricComparisonResponse> {
    return apiRequest<MetricComparisonResponse>(
      `/profiles/${profileId}/reports/compare?metricName=${encodeURIComponent(metricName)}`,
    );
  },

  // Emergency SOS & ShareLink
  async triggerSos(
    profileId: string,
    payload: { locationText?: string; latitude?: number; longitude?: number } = {},
  ): Promise<import("./types.js").SosTriggerResponse> {
    return apiRequest<import("./types.js").SosTriggerResponse>(`/profiles/${profileId}/sos`, {
      method: "POST",
      body: payload,
    });
  },

  async getEmergencyShare(token: string): Promise<import("./types.js").EmergencySummary> {
    return apiRequest<import("./types.js").EmergencySummary>(`/share/${token}`);
  },
};
