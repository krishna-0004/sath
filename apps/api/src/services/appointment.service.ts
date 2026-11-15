import { NotFoundError } from "../errors/http-errors.js";
import { type AppointmentDocument } from "../models/appointment.model.js";
import { appointmentRepository } from "../repositories/appointment.repository.js";
import type {
  CreateAppointmentInput,
  UpdateAppointmentInput,
} from "../schemas/appointment.schema.js";

export const appointmentService = {
  async createAppointment(
    profileId: string,
    userId: string,
    input: CreateAppointmentInput,
  ): Promise<AppointmentDocument> {
    return appointmentRepository.create({
      profileId,
      title: input.title,
      doctorName: input.doctorName,
      location: input.location ?? "",
      startsAt: new Date(input.startsAt),
      notes: input.notes ?? "",
      createdBy: userId,
    });
  },

  async listAppointments(profileId: string): Promise<AppointmentDocument[]> {
    return appointmentRepository.findByProfile(profileId);
  },

  async updateAppointment(
    profileId: string,
    appointmentId: string,
    input: UpdateAppointmentInput,
  ): Promise<AppointmentDocument> {
    const apt = await appointmentRepository.findById(appointmentId);
    if (!apt || apt.profileId.toString() !== profileId) {
      throw new NotFoundError("Appointment not found");
    }

    const updated = await appointmentRepository.update(appointmentId, {
      ...input,
      startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
    });

    if (!updated) {
      throw new NotFoundError("Appointment not found");
    }

    return updated;
  },

  async deleteAppointment(profileId: string, appointmentId: string): Promise<void> {
    const apt = await appointmentRepository.findById(appointmentId);
    if (!apt || apt.profileId.toString() !== profileId) {
      throw new NotFoundError("Appointment not found");
    }

    await appointmentRepository.delete(appointmentId);
  },
};
