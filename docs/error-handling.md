# Error Handling Specification

## 1. The Uniform Error Contract

All backend API and AI microservice responses use the unified error envelope established in `AGENTS.md`:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description safe for client consumption",
    "details": [
      {
        "path": "medication_name",
        "message": "Medication name is required"
      }
    ],
    "requestId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
  }
}
```

Every response, whether success or error, includes an `X-Request-Id` HTTP header matching `error.requestId`.

## 2. Status Code to Machine Error Code Mapping

| HTTP Status | Machine Code             | Description                              | Typical Cause                                |
| ----------- | ------------------------ | ---------------------------------------- | -------------------------------------------- |
| **400**     | `VALIDATION_ERROR`       | Request failed schema validation         | Missing required fields, invalid formats     |
| **400**     | `INVALID_JSON`           | Body parser failed to parse payload      | Malformed JSON syntax in request body        |
| **401**     | `UNAUTHENTICATED`        | Missing or invalid authentication token  | Expired session, invalid Bearer token        |
| **401**     | `TOKEN_EXPIRED`          | Access token JWT has expired (15 min)    | Prompts client to execute refresh rotation   |
| **401**     | `REFRESH_INVALID`        | Refresh token missing, bad, or expired   | Session revoked or expired (redirect /login) |
| **401**     | `REFRESH_REUSED`         | Already-rotated refresh token replayed   | Token reuse detected; revokes family         |
| **401**     | `OAUTH_FAILED`           | OAuth exchange with provider failed      | Google token endpoint failure or denial      |
| **401**     | `OAUTH_STATE_MISMATCH`   | OAuth state cookie missing or mismatched | Session timeout or CSRF attempt on callback  |
| **403**     | `FORBIDDEN`              | Authenticated caller lacks permissions   | Elder-only action attempted by non-owner     |
| **403**     | `CSRF_REJECTED`          | CSRF header or origin allowlist check    | Missing X-Saath-CSRF header or bad Origin    |
| **403**     | `ACCOUNT_DISABLED`       | User account status set to disabled      | Administrative suspension of account access  |
| **404**     | `NOT_FOUND`              | Resource or route does not exist         | Unknown route, deleted record, disabled demo |
| **409**     | `CONFLICT`               | Resource conflict in data layer          | Duplicate key error (e.g. Mongoose 11000)    |
| **409**     | `REFRESH_RACE`           | Concurrent refresh within leeway window  | Informs client to pause 300ms and retry      |
| **413**     | `PAYLOAD_TOO_LARGE`      | Payload exceeds max size limit           | Upload file or body > 100KB (or 4MB in AI)   |
| **415**     | `UNSUPPORTED_MEDIA_TYPE` | Content-Type header not accepted         | Non-JSON or unsupported audio MIME           |
| **422**     | `UNPROCESSABLE_ENTITY`   | Semantic validation failed               | Logical inconsistency in payload             |
| **429**     | `RATE_LIMITED`           | Rate limit threshold exceeded            | Too many requests from client IP             |
| **500**     | `INTERNAL_ERROR`         | Unexpected server error                  | Uncaught runtime error (stack suppressed)    |
| **502**     | `UPSTREAM_ERROR`         | Upstream service failed                  | External provider failure (e.g., ElevenLabs) |
| **503**     | `SERVICE_UNAVAILABLE`    | Service not ready or sleeping            | Database connection down, warm-up phase      |

## 3. Layered Error Handling Flow

### A. Backend API Central Error Handler (`apps/api/src/middleware/error-handler.ts`)

1. Detects `AppError` instances -> formats configured code, message, and details.
2. Detects `ZodError` -> returns 400 `VALIDATION_ERROR` with path/message details.
3. Detects Mongoose `ValidationError` / `CastError` -> returns 400 `VALIDATION_ERROR`.
4. Detects Mongoose duplicate key (`code: 11000`) -> returns 409 `CONFLICT`.
5. Detects Body-parser syntax errors -> returns 400 `INVALID_JSON`.
6. Detects Payload too large (`entity.too.large`) -> returns 413 `PAYLOAD_TOO_LARGE`.
7. Catches all other errors -> logs full stack and cause at `error` level (Pino), and returns 500 `INTERNAL_ERROR` with a generic safe message (stack trace never sent to client).

### B. AI Microservice Exception Handlers (`apps/ai/app/main.py`)

1. `AppError` -> status, code, details mapped to envelope.
2. `RequestValidationError` -> 400 `VALIDATION_ERROR` with field paths.
3. `StarletteHTTPException` -> status-based code lookup (e.g., 404 -> `NOT_FOUND`).
4. `RateLimitExceeded` -> 429 `RATE_LIMITED` with details.
5. Generic `Exception` -> structured error log with full traceback and `requestId`, returning 500 `INTERNAL_ERROR` without leaking internal messages.

### C. Frontend API Client (`apps/web/src/lib/api-client.ts`)

- Automatically parses backend envelope into strongly-typed `ApiError` instances.
- Non-envelope responses (e.g., raw HTML 502/504 from sleeping Render instances, network loss) are caught and synthesized into `ApiError` with codes:
  - `TIMEOUT`: Request exceeded 15 s timeout.
  - `OFFLINE`: Browser has no active internet connection.
  - `SERVER_UNAVAILABLE`: Network failure while online or HTTP 502/503/504.
  - `UNEXPECTED_RESPONSE`: Malformed response from server.
- Safe GET requests automatically retry up to 2 times with exponential backoff and jitter on 503/504 and network errors. Mutating requests (POST/PUT/PATCH/DELETE) are never retried automatically.

## 4. Frontend Error UX Rules

1. **No Raw Codes**: The user interface never displays machine codes (e.g. `SERVICE_UNAVAILABLE`, `RATE_LIMITED`) or stack traces.
2. **Kind, Plain Language**: Errors are mapped via `getErrorMessage(error)` to empathetic, actionable sentences (e.g. "We could not connect to your care thread. Please check your internet connection or try again in a moment.").
3. **Graceful Fallbacks**:
   - `AppErrorBoundary` wraps root and displays a full-page fallback with "Try again" and "Go home".
   - `RouteErrorBoundary` handles route-level exceptions.
   - `ServerWakingBanner` appears when Render free service is spinning up (> 3 s delay).
   - `OfflineBanner` appears immediately when `navigator.onLine` becomes false.
