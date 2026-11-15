import "dotenv/config";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { configurePassport } from "./config/passport.js";
import { connectDb, disconnectDb } from "./db/connect.js";
import type { Server } from "node:http";

// Register Passport authentication strategies
configurePassport();

const app = createApp();

let server: Server | undefined;

async function startServer(): Promise<void> {
  server = app.listen(env.PORT, () => {
    logger.info(
      { port: env.PORT, nodeEnv: env.NODE_ENV },
      `Saath API server listening on http://localhost:${env.PORT}`,
    );
  });

  // Attempt database connection without blocking HTTP server startup
  connectDb(env.MONGODB_URI).catch((err) => {
    logger.warn(
      { err },
      "Database not immediately reachable; /api/ready will report 503 until connected",
    );
  });
}

async function gracefulShutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Received shutdown signal, starting graceful shutdown...");

  const forceTimeout = setTimeout(() => {
    logger.error("Graceful shutdown timed out after 10s, forcing exit");
    process.exit(1);
  }, 10000);
  forceTimeout.unref();

  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
      logger.info("HTTP server closed to new connections");
    }

    await disconnectDb();
    logger.info("Database connection closed cleanly");
    process.exit(0);
  } catch (err) {
    logger.error({ err }, "Error during graceful shutdown, terminating process");
    process.exit(1);
  }
}

process.on("SIGTERM", () => {
  void gracefulShutdown("SIGTERM");
});

process.on("SIGINT", () => {
  void gracefulShutdown("SIGINT");
});

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection detected in server runtime");
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  logger.error({ error }, "Uncaught exception detected in server runtime");
  process.exit(1);
});

void startServer();
