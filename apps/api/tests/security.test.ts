import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

const app = createApp();

describe("Security & Headers Middleware", () => {
  it("enforces Helmet security headers", async () => {
    const res = await request(app).get("/api/health");

    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBe("DENY");
    expect(res.headers["strict-transport-security"]).toBeDefined();
    expect(res.headers["content-security-policy"]).toContain("default-src 'none'");
  });

  it("ensures X-Powered-By header is completely disabled", async () => {
    const res = await request(app).get("/api/health");

    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("permits allowed CORS origin with credentials support", async () => {
    const res = await request(app).get("/api/health").set("Origin", "http://localhost:5173");

    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("blocks unapproved CORS origin", async () => {
    const res = await request(app)
      .get("/api/health")
      .set("Origin", "https://malicious-external-site.com");

    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
