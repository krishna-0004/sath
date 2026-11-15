import type { Request, Response } from "express";
import { doctorContactService } from "../services/doctor-contact.service.js";
import { UnauthenticatedError } from "../errors/http-errors.js";
import type { CreateDoctorContactInput } from "../schemas/doctor-contact.schema.js";

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

export const doctorContactController = {
  async create(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const profileId = getParam(req, "id") || getParam(req, "profileId");
    const input = (req.validated?.body ?? req.body) as CreateDoctorContactInput;

    const contact = await doctorContactService.createDoctorContact(profileId, userId, input);
    res.status(201).json({ contact: contact.toJSON() });
  },

  async list(req: Request, res: Response): Promise<void> {
    const profileId = getParam(req, "id") || getParam(req, "profileId");
    const contacts = await doctorContactService.listDoctorContacts(profileId);
    res.json({ contacts: contacts.map((c) => c.toJSON()) });
  },

  async revoke(req: Request, res: Response): Promise<void> {
    const profileId = getParam(req, "id") || getParam(req, "profileId");
    const contactId = getParam(req, "contactId");

    await doctorContactService.revokeDoctorContact(profileId, contactId);
    res.status(204).send();
  },
};
