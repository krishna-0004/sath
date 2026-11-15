import express, { type Express } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createRateLimiter } from "../src/middleware/rate-limit.js";
import { requestIdMiddleware } from "../src/middleware/request-id.js";

function createRateLimitedApp(): Express {
  const app = express();
  app.use(requestIdMiddleware);

  const testLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 2,
    message: "Rate limit reached for test",
  });

  app.get("/rate-limited-endpoint", testLimiter, (_req, res) => {
    res.json({ status: "ok" });
  });

  return app;
}

describe("Rate Limiting Middleware Factory", () => {
  const app = createRateLimitedApp();

  it("permits requests under the limit and blocks the (N+1)th request with 429 envelope", async () => {
    const res1 = await request(app).get("/rate-limited-endpoint");
    expect(res1.status).toBe(200);

    const res2 = await request(app).get("/rate-limited-endpoint");
    expect(res2.status).toBe(200);

    const res3 = await request(app).get("/rate-limited-endpoint");
    expect(res3.status).toBe(429);
    expect(res3.body.error).toBeDefined();
    expect(res3.body.error.code).toBe("RATE_LIMITED");
    expect(res3.body.error.message).toBe("Rate limit reached for test");
    expect(res3.body.error.requestId).toBeDefined();
  });
});
