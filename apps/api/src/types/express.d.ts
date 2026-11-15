declare global {
  namespace Express {
    interface Request {
      requestId: string;
      auth?: {
        userId: string;
      };
      validated?: {
        body?: unknown;
        query?: unknown;
        params?: unknown;
      };
    }
  }
}

export {};
