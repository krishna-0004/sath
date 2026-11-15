# Architecture Documentation

## 1. System Overview & Monorepo Structure

Saath is built as a modular monorepo structured around three dedicated application tiers:

- **`apps/web`**: React 19 + Vite + TypeScript client application styled with Tailwind CSS v4. Deployed as a static SPA on Netlify with automated rewrites.
- **`apps/api`**: Express 5 + TypeScript backend service managing state, database persistence (MongoDB via Mongoose), authentication, and business workflows. Deployed as a free web service on Render.
- **`apps/ai`**: FastAPI + Python 3.12 microservice managing Gemini multimodal inference, transcription, document diffing, and ElevenLabs voice generation. Managed exclusively with `uv` and deployed as a free web service on Render.

```mermaid
flowchart LR
    Browser["Client Browser (Elder / Family)"]
    Netlify["Netlify Edge CDN<br/>(SPA & /api/* 200 Proxy)"]
    API["Render: saath-api<br/>(Node 20 / Express 5)"]
    AI["Render: saath-ai<br/>(Python 3.12 / FastAPI)"]
    DB[("MongoDB Atlas")]
    Gemini["Google Gemini API"]
    Eleven["ElevenLabs API"]

    Browser -->|"GET / (HTML/CSS/JS)"| Netlify
    Browser -->|"Fetch /api/* (First-party cookies)"| Netlify
    Netlify -->|"Proxy Rewrite (Status 200)"| API
    API -->|"Mongoose Connect"| DB
    API -->|"Authorization: Bearer ServiceToken"| AI
    AI -->|"Multimodal Prompts"| Gemini
    AI -->|"Audio Generation"| Eleven
```

## 2. Request & Proxy Flow

1. **Client Interaction**: All user interactions originate in `apps/web`. The frontend never accesses or resolves external backend hostnames directly; all API calls target the relative path `/api/*`.
2. **First-Party Cookie Isolation**:
   - In production, Netlify's CDN intercepts `/api/*` and proxies requests directly to `https://saath-api.onrender.com/api/:splat` using a status 200 rewrite.
   - In local development, the Vite dev server proxies `/api` requests to `http://localhost:4000/api`.
   - As a result, all session and refresh cookies remain strictly first-party (`SameSite=Lax`, `httpOnly`, `Secure`).
3. **Internal Microservice Communication**:
   - `apps/api` communicates with `apps/ai` over HTTPS using an internal Bearer token (`AI_SERVICE_TOKEN`).
   - The AI service does not accept direct public web traffic (CORS is completely omitted; endpoints require the service token).

## 3. Layering & Separation of Concerns

### `apps/api` (Backend)

- **`routes/`**: Route definitions and URL parameter bindings only. No logic or error interception.
- **`middleware/`**: Cross-cutting concerns: Request ID assignment, logging, security headers (Helmet), CORS, body parsing, injection sanitization, rate limiting, and Zod schema validation.
- **`controllers/`**: HTTP request unpacking, delegating to domain services, and returning JSON responses. Controllers contain zero database queries.
- **`services/`**: Business domain logic, transaction management, external service communication. Services receive plain parameters and return plain data; they have no awareness of `req` or `res`.
- **`db/` / models**: Database connections, schemas, indexes, and queries.

### `apps/ai` (Inference Service)

- **`routers/`**: HTTP contract definitions, dependency injection (`require_service_token`), and parameter binding.
- **`services/`**: AI orchestration, prompt formatting, document parsing, and speech synthesis.
- **`schemas/`**: Pydantic v2 input and output models guaranteeing runtime validation.

## 4. Error Flow & Contract

Every tier conforms to the uniform error envelope defined in `AGENTS.md`:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable, safe message",
    "details": [{ "path": "field_name", "message": "Specific explanation" }],
    "requestId": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6"
  }
}
```

- Operational errors are caught and transformed into stable machine codes (`VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `SERVICE_UNAVAILABLE`).
- Unhandled crashes yield a generic 500 `INTERNAL_ERROR` envelope. Stack traces and raw internal error strings are never leaked to clients.
- `X-Request-Id` is bound at the ingress point and propagated across headers, logs, and error responses.

## 5. Authentication & Session Architecture (Phase 1)

### A. Lifecycle Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User as Elder / Family User
    participant Browser as apps/web (Browser)
    participant API as apps/api (Express 5)
    participant Google as Google Accounts
    participant DB as MongoDB Atlas

    Note over User,Google: 1. OAuth Sign In Flow
    User->>Browser: Clicks "Sign in with Google"
    Browser->>API: GET /api/auth/google?returnTo=/app
    API->>Browser: 302 Redirect to Google OAuth (sets signed saath_oauth state cookie)
    Browser->>Google: Authenticates & grants openid, email, profile
    Google->>API: GET /api/auth/google/callback?code=...&state=...
    API->>Google: Exchange authorization code
    Google-->>API: Returns user identity
    API->>DB: Upsert User & create RefreshToken (familyId, tokenHash)
    API->>Browser: 302 to /app with Set-Cookie: saath_at, saath_rt, clear saath_oauth

    Note over Browser,DB: 2. Active Session Initialization
    Browser->>API: GET /api/auth/me (Cookie: saath_at, X-Saath-CSRF: 1)
    API->>DB: Lookup user by req.auth.userId
    API-->>Browser: 200 OK { user: { name, email, ... } }

    Note over Browser,DB: 3. Token Expiry & Single-Flight Refresh
    Note over Browser: 15 minutes elapse (access token expires)
    Browser->>API: GET /api/medications (Cookie: expired saath_at)
    API-->>Browser: 401 Unauthorized { error: { code: "TOKEN_EXPIRED" } }
    Note over Browser: api-client pauses and initiates single-flight refresh
    Browser->>API: POST /api/auth/refresh (Cookie: saath_rt, X-Saath-CSRF: 1)
    API->>DB: Verify tokenHash & rotate (new tokenHash, link replacedById)
    API-->>Browser: 204 No Content with new Set-Cookie: saath_at, saath_rt
    Browser->>API: Retry original GET /api/medications (with fresh saath_at)
    API-->>Browser: 200 OK (data delivered seamlessly)

    Note over User,DB: 4. User Sign Out Flow
    User->>Browser: Opens UserMenu & clicks "Sign out"
    Browser->>API: POST /api/auth/logout (Cookie: saath_rt, X-Saath-CSRF: 1)
    API->>DB: Mark current RefreshToken revokedAt = new Date()
    API-->>Browser: 204 No Content (Clear saath_at and saath_rt cookies)
    Browser->>Browser: Clears query cache & redirects to /login
```

### B. Security Guarantees

- **Zero JS Token Storage**: All tokens live in `httpOnly` cookies. No script, XSS vector, or third-party snippet can read access or refresh credentials.
- **CSRF Defense**: Custom header `X-Saath-CSRF: 1` required on all state-mutating HTTP methods (POST, PUT, PATCH, DELETE) combined with `SameSite` cookies and Origin allowlist verification.
- **Refresh Rotation**: Opaque 32-byte tokens hashed with SHA-256 in MongoDB. Each rotation revokes the previous token and links `replacedById`. Concurrent race conditions are protected by a 10-second leeway window; replay of an already-rotated token after leeway revokes the entire family immediately.
