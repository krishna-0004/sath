import "dotenv/config";

process.env["NODE_ENV"] = "test";
process.env["LOG_LEVEL"] = "error";
process.env["MONGODB_URI"] = process.env["MONGODB_URI"] || "mongodb://localhost:27017/saath_test";
process.env["CLIENT_ORIGIN"] = process.env["CLIENT_ORIGIN"] || "http://localhost:5173";
process.env["AI_SERVICE_URL"] = process.env["AI_SERVICE_URL"] || "http://localhost:8000";
process.env["AI_SERVICE_TOKEN"] =
  process.env["AI_SERVICE_TOKEN"] || "test-service-token-at-least-32-characters-long-for-security";

// Phase 1 Authentication test defaults
process.env["GOOGLE_CLIENT_ID"] =
  process.env["GOOGLE_CLIENT_ID"] || "test-google-client-id.apps.googleusercontent.com";
process.env["GOOGLE_CLIENT_SECRET"] =
  process.env["GOOGLE_CLIENT_SECRET"] || "test-google-client-secret";
process.env["GOOGLE_CALLBACK_URL"] =
  process.env["GOOGLE_CALLBACK_URL"] || "http://localhost:4000/api/auth/google/callback";
process.env["JWT_ACCESS_SECRET"] =
  process.env["JWT_ACCESS_SECRET"] || "test-jwt-access-secret-minimum-32-characters-long-key";
process.env["COOKIE_SECRET"] =
  process.env["COOKIE_SECRET"] || "test-cookie-secret-different-and-32-characters-long";
process.env["ACCESS_TOKEN_TTL_SECONDS"] = process.env["ACCESS_TOKEN_TTL_SECONDS"] || "900";
process.env["REFRESH_TOKEN_TTL_DAYS"] = process.env["REFRESH_TOKEN_TTL_DAYS"] || "7";
process.env["REFRESH_REUSE_LEEWAY_SECONDS"] = process.env["REFRESH_REUSE_LEEWAY_SECONDS"] || "10";
process.env["DEMO_LOGIN_ENABLED"] = process.env["DEMO_LOGIN_ENABLED"] || "true";
