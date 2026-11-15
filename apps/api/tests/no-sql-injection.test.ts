import express, { type Express } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { noSqlInjectionMiddleware } from "../src/middleware/no-sql-injection.js";
import { requestIdMiddleware } from "../src/middleware/request-id.js";

function createNoSqlApp(): Express {
  const app = express();
  app.use(requestIdMiddleware);
  app.use(express.json());
  app.use(noSqlInjectionMiddleware);

  app.post("/test-target", (req, res) => {
    res.json({ status: "ok", body: req.body });
  });

  app.get("/test-target", (req, res) => {
    res.json({ status: "ok", query: req.query });
  });

  app.get("/test-target/:paramName", (req, res) => {
    res.json({ status: "ok", params: req.params });
  });

  return app;
}

describe("NoSQL Injection Rejecting Middleware", () => {
  const app = createNoSqlApp();

  it("permits safe requests without dollar signs or dots", async () => {
    const res = await request(app).post("/test-target").send({ safeKey: "safeValue", count: 10 });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("rejects request body containing $ operator key with 400", async () => {
    const res = await request(app).post("/test-target").send({ $ne: 1 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects request body containing dotted key with 400", async () => {
    const res = await request(app).post("/test-target").send({ "profile.admin": true });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects nested object with $ operator key", async () => {
    const res = await request(app)
      .post("/test-target")
      .send({ filter: { $gt: 50 } });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects query parameters containing $ operator", async () => {
    const res = await request(app).get("/test-target?$where=true");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects query parameters containing dotted key", async () => {
    const res = await request(app).get("/test-target?user.role=admin");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
