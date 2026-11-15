import pino from "pino";

const redactPaths = [
  "authorization",
  "cookie",
  "set-cookie",
  "password",
  "passcode",
  "token",
  "*.token",
  "req.headers.authorization",
  "req.headers.cookie",
  'res.headers["set-cookie"]',
];

export const logger = pino({
  level: process.env["LOG_LEVEL"] || "info",
  redact: {
    paths: redactPaths,
    censor: "[REDACTED]",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
