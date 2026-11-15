import { AppointmentModel, type AppointmentDocument } from "../models/appointment.model.js";

export interface CreateAppointmentDto {
  profileId: string;
  title: string;
  doctorName: string;
  location?: string;
  startsAt: Date;
  notes?: string;
  createdBy: string;
}

export interface UpdateAppointmentDto {
  title?: string;
  doctorName?: string;
  location?: string;
  startsAt?: Date;
  notes?: string;
}

export const appointmentRepository = {
  async create(data: CreateAppointmentDto): Promise<AppointmentDocument> {
    const apt = new AppointmentModel(data);
    return apt.save();
  },

  async findById(id: string): Promise<AppointmentDocument | null> {
    return AppointmentModel.findById(id).exec();
  },

  async findByProfile(profileId: string): Promise<AppointmentDocument[]> {
    return AppointmentModel.find({ profileId }).sort({ startsAt: 1 }).exec();
  },

  async findUpcomingByProfile(
    profileId: string,
    sinceDate = new Date(),
  ): Promise<AppointmentDocument[]> {
    return AppointmentModel.find({
      profileId,
      startsAt: { $gte: sinceDate },
    })
      .sort({ startsAt: 1 })
      .exec();
  },

  async update(id: string, updates: UpdateAppointmentDto): Promise<AppointmentDocument | null> {
    return AppointmentModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true },
    ).exec();
  },

  async delete(id: string): Promise<boolean> {
    const res = await AppointmentModel.findByIdAndDelete(id).exec();
    return Boolean(res);
  },

  async deleteByProfileId(profileId: string): Promise<number> {
    const res = await AppointmentModel.deleteMany({ profileId }).exec();
    return res.deletedCount ?? 0;
  },
};
