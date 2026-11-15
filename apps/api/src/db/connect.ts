import mongoose from "mongoose";
import { logger } from "../config/logger.js";

let isConnected = false;

/**
 * Returns whether the database connection is currently active and ready.
 */
export function isDbReady(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}

/**
 * Connects to MongoDB with automatic retry up to 3 times and backoff.
 */
export async function connectDb(uri: string, maxRetries = 3): Promise<void> {
  mongoose.connection.on("connected", () => {
    isConnected = true;
    logger.info("MongoDB connection established");
  });

  mongoose.connection.on("error", (err) => {
    isConnected = false;
    logger.error({ err }, "MongoDB connection error occurred");
  });

  mongoose.connection.on("disconnected", () => {
    isConnected = false;
    logger.warn("MongoDB connection disconnected");
  });

  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      attempt++;
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
      });
      isConnected = true;
      return;
    } catch (err) {
      logger.warn(
        { attempt, maxRetries, err },
        "MongoDB connection attempt failed, backing off...",
      );
      if (attempt >= maxRetries) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
}

/**
 * Closes the active MongoDB connection.
 */
export async function disconnectDb(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    logger.info("MongoDB disconnected gracefully");
  }
}
