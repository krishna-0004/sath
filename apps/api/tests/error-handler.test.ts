import express, { type Express } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ForbiddenError } from "../src/errors/http-errors.js";
import { errorHandlerMiddleware } from "../src/middleware/error-handler.js";
import { requestIdMiddleware } from "../src/middleware/request-id.js";

function createErrorApp(): Express {
  const app = express();
  app.use(requestIdMiddleware);
  app.use(express.json({ limit: "50b" }));

  app.get("/test-app-error", () => {
    throw new ForbiddenError("Cannot access this resource");
  });

  app.get("/test-zod-error", () => {
    z.string().parse(12345);
  });

  app.get("/test-duplicate-key", () => {
    const err = new Error("Duplicate key error") as Error & { code: number };
    err.code = 11000;
    throw err;
  });

  app.get("/test-mongoose-validation", () => {
    const err = new Error("Cast failed") as Error & { name: string };
    err.name = "CastError";
    throw err;
  });

  app.get("/test-unknown-error", () => {
    throw new Error("Internal secret connection crash");
  });

  app.post("/test-body", (req, res) => {
    res.json({ received: req.body });
  });

  app.use(errorHandlerMiddleware);
  return app;
}

describe("Central Error Handler Middleware", () => {
  const app = createErrorApp();

  it("handles AppError and subclasses correctly", async () => {
    const res = await request(app).get("/test-app-error");

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
    expect(res.body.error.message).toBe("Cannot access this resource");
    expect(res.body.error.requestId).toBeDefined();
  });

  it("handles ZodError as 400 VALIDATION_ERROR with field details", async () => {
    const res = await request(app).get("/test-zod-error");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(Array.isArray(res.body.error.details)).toBe(true);
  });

  it("handles Mongoose duplicate key 11000 error as 409 CONFLICT", async () => {
    const res = await request(app).get("/test-duplicate-key");

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("handles Mongoose ValidationError/CastError as 400 VALIDATION_ERROR", async () => {
    const res = await request(app).get("/test-mongoose-validation");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("handles malformed JSON body as 400 INVALID_JSON", async () => {
    const res = await request(app)
      .post("/test-body")
      .set("Content-Type", "application/json")
      .send("{ invalid json: ");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_JSON");
  });

  it("handles oversize request body as 413 PAYLOAD_TOO_LARGE", async () => {
    const oversizedPayload = { data: "x".repeat(200) };
    const res = await request(app).post("/test-body").send(oversizedPayload);

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("handles generic unknown error as 500 INTERNAL_ERROR without stack trace in production", async () => {
    const originalEnv = process.env["NODE_ENV"];
    process.env["NODE_ENV"] = "production";

    try {
      const res = await request(app).get("/test-unknown-error");

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe("INTERNAL_ERROR");
      expect(res.body.error.message).toBe("An unexpected server error occurred");
      expect(res.body.error.stack).toBeUndefined();
    } finally {
      process.env["NODE_ENV"] = originalEnv;
    }
  });
});
