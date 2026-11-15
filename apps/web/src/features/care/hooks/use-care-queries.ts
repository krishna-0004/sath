import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { careApi } from "../api.js";
import type { DoctorContactKind, DoseStatus, ProfileRole } from "../types.js";

export const careKeys = {
  profiles: ["care", "profiles"] as const,
  profile: (id: string) => ["care", "profile", id] as const,
  members: (id: string) => ["care", "members", id] as const,
  dosesToday: (id: string) => ["care", "doses", "today", id] as const,
  dosesSummary: (id: string, days: number) => ["care", "doses", "summary", id, days] as const,
  medicines: (id: string) => ["care", "medicines", id] as const,
  appointments: (id: string) => ["care", "appointments", id] as const,
  doctorContacts: (id: string) => ["care", "doctor-contacts", id] as const,
};

export function useProfiles() {
  return useQuery({
    queryKey: careKeys.profiles,
    queryFn: careApi.getProfiles,
  });
}

export function useProfile(profileId: string) {
  return useQuery({
    queryKey: careKeys.profile(profileId),
    queryFn: () => careApi.getProfile(profileId),
    enabled: Boolean(profileId),
  });
}

export function useMembers(profileId: string) {
  return useQuery({
    queryKey: careKeys.members(profileId),
    queryFn: () => careApi.listMembers(profileId),
    enabled: Boolean(profileId),
  });
}

export function useTodayDoses(profileId: string) {
  return useQuery({
    queryKey: careKeys.dosesToday(profileId),
    queryFn: () => careApi.getTodayDoses(profileId),
    enabled: Boolean(profileId),
    refetchInterval: 60000, // Refresh schedule every minute
  });
}

export function useDoseSummary(profileId: string, days = 7) {
  return useQuery({
    queryKey: careKeys.dosesSummary(profileId, days),
    queryFn: () => careApi.getDoseSummary(profileId, days),
    enabled: Boolean(profileId),
  });
}

export function useMedicines(profileId: string) {
  return useQuery({
    queryKey: careKeys.medicines(profileId),
    queryFn: () => careApi.getMedicines(profileId),
    enabled: Boolean(profileId),
  });
}

export function useAppointments(profileId: string) {
  return useQuery({
    queryKey: careKeys.appointments(profileId),
    queryFn: () => careApi.getAppointments(profileId),
    enabled: Boolean(profileId),
  });
}

export function useDoctorContacts(profileId: string, isElder: boolean) {
  return useQuery({
    queryKey: careKeys.doctorContacts(profileId),
    queryFn: () => careApi.getDoctorContacts(profileId),
    enabled: Boolean(profileId) && isElder,
  });
}

export function useCreateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: careApi.createProfile,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: careKeys.profiles });
    },
  });
}

export function useJoinProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: careApi.joinProfile,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: careKeys.profiles });
    },
  });
}

export function useUpdateProfile(profileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { elderName?: string; timezone?: string; emergencyPhone?: string | null }) =>
      careApi.updateProfile(profileId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: careKeys.profile(profileId) });
      qc.invalidateQueries({ queryKey: careKeys.profiles });
    },
  });
}

export function useRotatePasscode(profileId: string) {
  return useMutation({
    mutationFn: (passcode: string) => careApi.rotatePasscode(profileId, passcode),
  });
}

export function useUpdateSharing(profileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sharing: { medicines?: boolean; reports?: boolean; appointments?: boolean }) =>
      careApi.updateSharing(profileId, sharing),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: careKeys.profile(profileId) });
    },
  });
}

export function useUpdateMemberRole(profileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ targetUserId, role }: { targetUserId: string; role: ProfileRole }) =>
      careApi.updateMemberRole(profileId, targetUserId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: careKeys.members(profileId) });
    },
  });
}

export function useRemoveMember(profileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId: string) => careApi.removeMember(profileId, targetUserId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: careKeys.members(profileId) });
    },
  });
}

export function useDeleteProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (profileId: string) => careApi.deleteProfile(profileId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: careKeys.profiles });
    },
  });
}

export function useRecordDose(profileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      doseId,
      status,
      reasonText,
    }: {
      doseId: string;
      status: DoseStatus;
      reasonText?: string;
    }) => careApi.recordDose(profileId, doseId, { status, reasonText }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: careKeys.dosesToday(profileId) });
      qc.invalidateQueries({ queryKey: ["care", "doses", "summary", profileId] });
    },
  });
}

export function useCreateMedicine(profileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      strengthText: string;
      frequencyText: string;
      anchors: string[];
      withFood?: string | null;
      notes?: string;
    }) => careApi.createMedicine(profileId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: careKeys.medicines(profileId) });
      qc.invalidateQueries({ queryKey: careKeys.dosesToday(profileId) });
    },
  });
}

export function useUpdateMedicine(profileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      medicineId,
      data,
    }: {
      medicineId: string;
      data: {
        name?: string;
        strengthText?: string;
        frequencyText?: string;
        anchors?: string[];
        withFood?: string | null;
        notes?: string;
      };
    }) => careApi.updateMedicine(profileId, medicineId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: careKeys.medicines(profileId) });
      qc.invalidateQueries({ queryKey: careKeys.dosesToday(profileId) });
    },
  });
}

export function useStopMedicine(profileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (medicineId: string) => careApi.stopMedicine(profileId, medicineId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: careKeys.medicines(profileId) });
      qc.invalidateQueries({ queryKey: careKeys.dosesToday(profileId) });
    },
  });
}

export function useCreateAppointment(profileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      doctorName: string;
      location?: string;
      startsAt: string;
      notes?: string;
    }) => careApi.createAppointment(profileId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: careKeys.appointments(profileId) });
    },
  });
}

export function useDeleteAppointment(profileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (appointmentId: string) => careApi.deleteAppointment(profileId, appointmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: careKeys.appointments(profileId) });
    },
  });
}

export function useCreateDoctorContact(profileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      kind: DoctorContactKind;
      name: string;
      email: string;
      whatsappNumber: string;
    }) => careApi.createDoctorContact(profileId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: careKeys.doctorContacts(profileId) });
    },
  });
}

export function useRevokeDoctorContact(profileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contactId: string) => careApi.revokeDoctorContact(profileId, contactId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: careKeys.doctorContacts(profileId) });
    },
  });
}
