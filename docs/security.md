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
