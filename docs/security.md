# Security Architecture and Controls

## 1. Threat Model Summary

Saath handles sensitive health data, family contact details, and prescription records for elders. Key security threats include:

1. **Token Theft & XSS Exploitation**: Attackers stealing stored authentication tokens via malicious scripts.
2. **NoSQL / SQL Injection**: Malicious input containing Mongo operators (e.g., `$ne`, `$gt`, `.` property access) targeting database persistence.
3. **Unauthorized AI Execution**: Abuse of costly Gemini or ElevenLabs inference endpoints.
4. **Data Exposure in Logs**: Accidental persistence of auth tokens, medical records, or passwords in application logs.
5. **Denial of Service (DoS) & Brute Force**: Repeated request floods degrading free-tier instances or exhausting API quotas.

## 2. Implemented Defense-in-Depth Controls

### A. HTTP Security Headers & Helmet

- **Helmet Middleware (`apps/api/src/middleware/security.ts`)**:
  - `Content-Security-Policy`: Default-src `'none'`; frame-ancestors `'none'` (preventing clickjacking).
  - `Strict-Transport-Security` (HSTS): Enabled with `maxAge: 31536000`, `includeSubDomains: true`.
  - `X-Content-Type-Options`: `nosniff`.
  - `X-Frame-Options`: `DENY`.
  - `Referrer-Policy`: `no-referrer`.
  - `X-Powered-By`: Explicitly removed.
  - `trust proxy = 1`: Configured for reverse proxy deployment behind Render.
- **Netlify Edge Security Headers (`apps/web/netlify.toml`)**:
  - Full CSP with self-hosted font support (`@fontsource-variable/inter`), strict script origins, and no external CDNs.
  - Permissions-Policy restricting access (`microphone=(self)`, `camera=()`, `geolocation=()`).

### B. First-Party Cookie Security & Zero JS Token Exposure

- **Rule 1 Enforcement**: Neither access tokens nor refresh tokens are accessible to client-side JavaScript.
- No tokens are ever written to or read from `localStorage` or `sessionStorage`.
- All authentication cookies are issued with `httpOnly: true`, `secure: true`, and `sameSite: "lax"`.

### C. Rejecting NoSQL/SQL Injection Perimeter Filter

- **Custom Rejecting Middleware (`apps/api/src/middleware/no-sql-injection.ts`)**:
  - In Express 5, `req.query` is a read-only getter. Rather than attempting error-prone in-place mutation, the middleware scans all keys across `req.body`, `req.query`, and `req.params`.
  - Any request containing keys starting with `$` or containing a `.` is immediately terminated with HTTP 400 `VALIDATION_ERROR`.

### D. Strict Input Validation (Zod & Pydantic)

- **API**: Every route validates payloads using `validate({ body?, query?, params? })` backed by Zod schemas. Validated data is assigned to `req.validated`.
- **AI Service**: Every endpoint parses incoming payloads via Pydantic v2 schemas. Type mismatches return structured 400 validation envelopes.

### E. Multi-Layer Rate Limiting

- **Global API Limiter**: Enforces 100 requests per 15 minutes per IP.
- **Strict API Limiter**: Enforces 10 requests per 15 minutes for sensitive endpoints (auth, recovery).
- **AI Service Limiter**: Slowapi rate limiter defaults to 100 requests per minute per IP address.
- Standard `RateLimit-*` headers returned; violations yield 429 `RATE_LIMITED` envelopes.

### F. Structured Log Redaction

- **Pino Redaction (`apps/api/src/config/logger.ts`)**:
  - Redacts `authorization`, `cookie`, `set-cookie`, `password`, `passcode`, `token`, and `*.token`.
  - HTTP logger suppresses request body logging.
- **Structlog Redaction (`apps/ai/app/core/logging.py`)**:
  - Custom processor recursively masks sensitive keys (`authorization`, `token`, `password`, `gemini_api_key`) before emitting JSON lines.

### G. Inter-Service Token Verification

- `apps/api` communicates with `apps/ai` by passing `Authorization: Bearer <AI_SERVICE_TOKEN>`.
- The AI service validates incoming tokens using constant-time string comparison (`hmac.compare_digest`) to prevent timing side-channel attacks.

## 3. Authentication & Session Architecture (Phase 1)

### A. Threat Model & Zero JS Token Exposure (Hard Rule 1)

- **Token Storage**: Neither access tokens nor refresh tokens are ever stored in `localStorage`, `sessionStorage`, or JavaScript-accessible cookies. An XSS vulnerability in client code cannot directly extract user authentication tokens.
- **Access Tokens**: Short-lived (15 minutes / 900s) JWT signed with HMAC-SHA256 (`jose`), strictly verifying issuer (`saath`), audience (`saath-web`), and pinned algorithms (`["HS256"]`). Stored in `saath_at` cookie (`httpOnly: true`, `SameSite: "Lax"`, `Secure: in production`, `Path: "/"`).
- **Refresh Tokens**: Cryptographically strong random 32-byte opaque tokens (`crypto.randomBytes(32).toString("base64url")`), valid for 7 days. Stored in `saath_rt` cookie (`httpOnly: true`, `SameSite: "Strict"`, `Secure: in production`, `Path: "/api/auth"`). Path restriction ensures refresh tokens are never sent on normal API data requests.
- **CSRF Defense-in-Depth**:
  1. `SameSite=Strict` on refresh cookie prevents third-party sites from triggering session refresh.
  2. `csrfGuardMiddleware`: Enforces `X-Saath-CSRF: 1` custom header on all state-changing methods (`POST`, `PUT`, `PATCH`, `DELETE`). Browsers prohibit cross-origin requests from setting custom headers without CORS preflight approval.
  3. Origin Allowlist: When an `Origin` header is present, it is strictly validated against `CLIENT_ORIGIN`. Mismatches return 403 `CSRF_REJECTED`.

### B. Refresh Token Rotation Lifecycle & Reuse Detection

- **Cryptographic Storage**: Refresh tokens are stored exclusively as SHA-256 hashes (`crypto.createHash("sha256").update(token).digest("hex")`). If the MongoDB database is compromised, plaintext tokens cannot be retrieved or used.
- **Family Tracking**: Every user session belongs to a `familyId`. When a refresh token is presented at `POST /api/auth/refresh`:
  1. The token is looked up by its SHA-256 hash.
  2. If active (`revokedAt == null` and `replacedById == null`): It is rotated. A new 32-byte token is generated, stored, linked via `replacedById`, and `usedAt` is set.
  3. **Concurrency Leeway Window (`REFRESH_REUSE_LEEWAY_SECONDS = 10`)**: If an already-rotated token is presented within 10 seconds of its rotation, it is treated as a benign network race condition between concurrent browser tabs. It responds with 409 `REFRESH_RACE` (or transparent retry) without revoking the session.
  4. **Reuse Detection (Theft Alert)**: If an already-rotated token is presented _after_ the leeway window has passed, token theft is inferred (an attacker replaying a stolen token). The service immediately revokes ALL active tokens in the entire family (`familyId`), terminating the compromised session everywhere and emitting an audit event.

### C. OAuth Security & Sanitized Return URLs

- **Google Strategy**: Uses Passport with `passport-google-oauth20`, `session: false`. Scopes are restricted strictly to `["openid", "email", "profile"]`.
- **OAuth CSRF Defense**: When a user clicks "Sign in with Google", a random 32-byte `state` is generated and signed with HMAC-SHA256 (`COOKIE_SECRET`). The signed state and sanitized `returnTo` path are stored in an httpOnly `saath_oauth` cookie (`SameSite: "Lax"`, 10-minute TTL, path `/api/auth/google`). In the OAuth callback, the state is verified, and the cookie is immediately cleared (one-time use).
- **ReturnTo Sanitization**: Redirect paths are sanitized to ensure they begin with a single `/` and do not begin with `//` or contain URL schemes (preventing open redirect vulnerabilities). Unsafe URLs fall back to `/app`.
- **Omission of Offline Access**: `access_type: "offline"` is deliberately omitted. Saath does not request or store Google long-lived refresh tokens. Saath manages its own secure, rotating refresh tokens independent of external Google credentials.

### D. Append-Only Security Audit Trail

- **Model**: `AuditEvent` collection in MongoDB stores security-critical lifecycle events (`LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`, `LOGOUT_ALL`, `TOKEN_REFRESH_SUCCESS`, `TOKEN_REFRESH_REUSE`, `TOKEN_REFRESH_RACE`, `CSRF_VIOLATION`, `ACCOUNT_DISABLED`).
- **Append-Only Immutability**: The `audit-event.repository.ts` exposes ONLY the `create` method. It defines no update, modify, or delete functions.
- **Non-Blocking Execution**: Audit logging is designed as fire-and-forget (`logAuditEvent(...).catch(...)`). Audit persistence failures are logged at error level but never abort or block user authentication.
