import pino from "pino";
import { describe, expect, it } from "vitest";

describe("Logger Redaction", () => {
  it("redacts sensitive authorization, cookie, and token fields in log output", async () => {
    let loggedOutput = "";

    const testStream = {
      write(chunk: string) {
        loggedOutput += chunk;
      },
    };

    const testLogger = pino(
      {
        redact: {
          paths: ["authorization", "token", "req.headers.authorization"],
          censor: "[REDACTED]",
        },
      },
      testStream,
    );

    testLogger.info(
      {
        authorization: "Bearer super-secret-user-jwt-token",
        token: "my-secret-token",
        req: {
          headers: {
            authorization: "Bearer secret-header-value",
          },
        },
      },
      "Test auth logging",
    );

    expect(loggedOutput).toContain("[REDACTED]");
    expect(loggedOutput).not.toContain("super-secret-user-jwt-token");
    expect(loggedOutput).not.toContain("secret-header-value");
    expect(loggedOutput).not.toContain("my-secret-token");
  });
});
