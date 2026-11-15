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
import { apiRouter } from "./routes/index.js";

/**
 * Creates and configures the Express application.
 *
 * Middleware execution order:
 * 1. request-id       - Assigns or echoes unique UUID tracing identifier
 * 2. http-logger      - Structured request/response logging via Pino
 * 3. security(helmet) - Hardens security headers, CSP, HSTS, frameguard
 * 4. cors             - Restricts allowed origins and credentials
 * 5. compression      - Deflate / Gzip HTTP responses
 * 6. express.json     - Parses JSON bodies with 100kb limit
 * 7. cookie-parser    - Parses signed/unsigned cookies
 * 8. no-sql-injection - Rejects queries or bodies with "$" or "." keys
 * 9. globalLimiter    - IP rate limiting (100 req / 15 min)
 * 10. routes          - Application API routes mounted under /api
 * 11. not-found       - 404 handler returning standard error envelope
 * 12. error-handler   - Central exception handler catching all errors
 */
export function createApp(): Express {
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
  app.use("/api", apiRouter);

  // 11. 404 Handler
  app.use(notFoundMiddleware);

  // 12. Central Error Handler
  app.use(errorHandlerMiddleware);

  return app;
}
