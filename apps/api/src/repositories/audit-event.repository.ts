import { AuditEventModel, type AuditEventDocument } from "../models/audit-event.model.js";

export interface CreateAuditEventInput {
  actorUserId?: string | null;
  action: string;
  outcome: "success" | "failure";
  metadata?: Record<string, unknown>;
  requestId?: string | null;
}

/**
 * Append-only repository for security and audit trail events.
 * Strictly exposes ONLY the `create` method.
 */
export const auditEventRepository = {
  async create(input: CreateAuditEventInput): Promise<AuditEventDocument> {
    return AuditEventModel.create({
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      outcome: input.outcome,
      metadata: input.metadata ?? {},
      requestId: input.requestId ?? null,
    });
  },
};
