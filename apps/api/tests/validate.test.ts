import express, { type Express } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { errorHandlerMiddleware } from "../src/middleware/error-handler.js";
import { requestIdMiddleware } from "../src/middleware/request-id.js";
import { validate } from "../src/middleware/validate.js";

function createValidateApp(): Express {
  const app = express();
  app.use(requestIdMiddleware);
  app.use(express.json());

  const testSchema = {
    body: z.object({
      name: z.string().min(2, "Name must have at least 2 characters"),
      age: z.number().int().positive(),
    }),
  };

  app.post("/test-validate", validate(testSchema), (req, res) => {
    res.json({ validated: req.validated });
  });

  app.use(errorHandlerMiddleware);
  return app;
}

describe("Validate Middleware", () => {
  const app = createValidateApp();

  it("passes valid data through to req.validated", async () => {
    const res = await request(app).post("/test-validate").send({ name: "Ramesh", age: 72 });

    expect(res.status).toBe(200);
    expect(res.body.validated.body).toEqual({ name: "Ramesh", age: 72 });
  });

  it("rejects invalid data with 400 VALIDATION_ERROR and specific field details", async () => {
    const res = await request(app).post("/test-validate").send({ name: "R", age: -5 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details).toHaveLength(2);
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "name" }),
        expect.objectContaining({ path: "age" }),
      ]),
    );
  });
});
