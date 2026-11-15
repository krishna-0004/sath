import { NotFoundError } from "../errors/http-errors.js";
import { type DoctorContactDocument } from "../models/doctor-contact.model.js";
import { doctorContactRepository } from "../repositories/doctor-contact.repository.js";
import type { CreateDoctorContactInput } from "../schemas/doctor-contact.schema.js";

export const doctorContactService = {
  async createDoctorContact(
    profileId: string,
    userId: string,
    input: CreateDoctorContactInput,
  ): Promise<DoctorContactDocument> {
    return doctorContactRepository.create({
      profileId,
      kind: input.kind,
      name: input.name,
      email: input.email,
      whatsappNumber: input.whatsappNumber,
      consentRecordedAt: new Date(),
      consentBy: userId,
    });
  },

  async listDoctorContacts(profileId: string): Promise<DoctorContactDocument[]> {
    return doctorContactRepository.findActiveByProfile(profileId);
  },

  async revokeDoctorContact(profileId: string, contactId: string): Promise<void> {
    const contact = await doctorContactRepository.findById(contactId);
    if (!contact || contact.profileId.toString() !== profileId) {
      throw new NotFoundError("Doctor contact not found");
    }

    await doctorContactRepository.revoke(contactId);
  },
};
