import type { Request, Response } from "express";
import { appointmentService } from "../services/appointment.service.js";
import { UnauthenticatedError } from "../errors/http-errors.js";
import type {
  CreateAppointmentInput,
  UpdateAppointmentInput,
} from "../schemas/appointment.schema.js";

function getUserId(req: Request): string {
  const userId = req.auth?.userId;
  if (!userId) {
    throw new UnauthenticatedError("Authentication required");
  }
  return userId;
}

function getParam(req: Request, name: string): string {
  const val = req.params[name];
  if (!val) return "";
  return Array.isArray(val) ? val[0]! : val;
}

export const appointmentController = {
  async create(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const profileId = getParam(req, "id") || getParam(req, "profileId");
    const input = (req.validated?.body ?? req.body) as CreateAppointmentInput;

    const apt = await appointmentService.createAppointment(profileId, userId, input);
    res.status(201).json({ appointment: apt.toJSON() });
  },

  async list(req: Request, res: Response): Promise<void> {
    const profileId = getParam(req, "id") || getParam(req, "profileId");
    const appointments = await appointmentService.listAppointments(profileId);
    res.json({ appointments: appointments.map((a) => a.toJSON()) });
  },

  async update(req: Request, res: Response): Promise<void> {
    const profileId = getParam(req, "id") || getParam(req, "profileId");
    const appointmentId = getParam(req, "aptId");
    const input = (req.validated?.body ?? req.body) as UpdateAppointmentInput;

    const updated = await appointmentService.updateAppointment(profileId, appointmentId, input);
    res.json({ appointment: updated.toJSON() });
  },

  async delete(req: Request, res: Response): Promise<void> {
    const profileId = getParam(req, "id") || getParam(req, "profileId");
    const appointmentId = getParam(req, "aptId");

    await appointmentService.deleteAppointment(profileId, appointmentId);
    res.status(204).send();
  },
};
