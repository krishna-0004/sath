import type { ProfileDocument } from "../models/profile.model.js";
import type { MembershipDocument } from "../models/membership.model.js";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      auth?: {
        userId: string;
      };
      profile?: ProfileDocument;
      membership?: MembershipDocument;
      validated?: {
        body?: unknown;
        query?: unknown;
        params?: unknown;
      };
    }
  }
}

export {};
