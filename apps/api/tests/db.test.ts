import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectDb, disconnectDb, isDbReady } from "../src/db/connect.js";
import { getReadiness } from "../src/services/health.service.js";

describe("Database Connection Manager", () => {
  let mongoServer: MongoMemoryServer | undefined;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
  });

  afterAll(async () => {
    await disconnectDb();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  it("successfully connects, reports isDbReady true, and satisfies getReadiness", async () => {
    expect(isDbReady()).toBe(false);

    if (mongoServer) {
      const uri = mongoServer.getUri();
      await connectDb(uri, 1);
      expect(isDbReady()).toBe(true);

      const readiness = getReadiness();
      expect(readiness.status).toBe("ok");
      expect(readiness.database).toBe("connected");
    }
  });

  it("handles graceful disconnect", async () => {
    await disconnectDb();
    expect(isDbReady()).toBe(false);
  });
});
