import compression from "compression";
import cookieParser from "cookie-parser";
import express, { type Express } from "express";
import { env } from "./config/env.js";
import { corsMiddleware } from "./middleware/cors.js";
import { errorHandlerMiddleware } from "./middleware/error-handler.js";
import { httpLoggerMiddleware } from "./middleware/http-logger.js";
import { noSqlInjectionMiddleware } from "./middleware/no-sql-injection.js";
import { notFoundMiddleware } from "./middleware/not-found.js";
import { globalLimiter } from "./middleware/rate-limit.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { securityMiddleware } from "./middleware/security.js";
import { createApiRouter } from "./routes/index.js";
import type { AuthControllerDependencies } from "./controllers/auth.controller.js";
import { configurePassport } from "./config/passport.js";

export type AppOptions = AuthControllerDependencies;

/**
 * Creates and configures the Express application.
 * Accepts optional dependency overrides (such as OAuth stubs for test environments).
 */
export function createApp(options: AppOptions = {}): Express {
  // Ensure Passport strategy is registered
  configurePassport();

  const app = express();

  // Render runs behind a reverse proxy
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  // 1. Request ID
  app.use(requestIdMiddleware);

  // 2. HTTP Logging
  app.use(httpLoggerMiddleware);

  // 3. Security Headers (Helmet)
  app.use(securityMiddleware);

  // 4. CORS
  app.use(corsMiddleware);

  // 5. Compression
  app.use(compression());

  // 6. JSON body parsing with strict 100kb limit
  app.use(express.json({ limit: "100kb" }));

  // 7. Cookie Parser with signature verification
  app.use(cookieParser(env.COOKIE_SECRET));

  // 8. Rejecting NoSQL injection filter
  app.use(noSqlInjectionMiddleware);

  // 9. Global Rate Limiter
  app.use(globalLimiter);

  // 10. Mount API Routes under /api
  app.use("/api", createApiRouter(options));

  // 11. 404 Handler
  app.use(notFoundMiddleware);

  // 12. Central Error Handler
  app.use(errorHandlerMiddleware);

  return app;
}
