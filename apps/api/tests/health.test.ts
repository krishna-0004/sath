import crypto from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

const app = createApp();

describe("Health & Base Routes", () => {
  it("GET /api/health returns 200 with liveness payload and X-Request-Id", async () => {
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(typeof res.body.uptime).toBe("number");
    expect(res.headers["x-request-id"]).toBeDefined();
  });

  it("echoes valid incoming X-Request-Id UUID header", async () => {
    const customId = crypto.randomUUID();
    const res = await request(app).get("/api/health").set("X-Request-Id", customId);

    expect(res.headers["x-request-id"]).toBe(customId);
  });

  it("replaces invalid X-Request-Id with a new valid UUID", async () => {
    const res = await request(app).get("/api/health").set("X-Request-Id", "not-a-valid-uuid");

    expect(res.headers["x-request-id"]).toBeDefined();
    expect(res.headers["x-request-id"]).not.toBe("not-a-valid-uuid");
  });

  it("GET /api/ready returns 503 envelope when database is disconnected", async () => {
    const res = await request(app).get("/api/ready");

    expect(res.status).toBe(503);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe("SERVICE_UNAVAILABLE");
    expect(res.body.error.requestId).toBeDefined();
  });

  it("returns 404 envelope for unknown routes", async () => {
    const res = await request(app).get("/api/non-existent-endpoint");

    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe("NOT_FOUND");
    expect(res.body.error.requestId).toBeDefined();
  });
});
