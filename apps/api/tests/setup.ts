import "dotenv/config";

process.env["NODE_ENV"] = "test";
process.env["LOG_LEVEL"] = "error";
process.env["MONGODB_URI"] = process.env["MONGODB_URI"] || "mongodb://localhost:27017/saath_test";
process.env["CLIENT_ORIGIN"] = process.env["CLIENT_ORIGIN"] || "http://localhost:5173";
process.env["AI_SERVICE_URL"] = process.env["AI_SERVICE_URL"] || "http://localhost:8000";
process.env["AI_SERVICE_TOKEN"] =
  process.env["AI_SERVICE_TOKEN"] || "test-service-token-at-least-32-characters-long-for-security";
