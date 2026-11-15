# Saath Development Progress Log

This log tracks verification protocol execution step-by-step.

## Phase 0 — Step 1: Install and clean-checkout sanity

- Status: PASS
- Evidence: `npm install` exit 0 (audited 848 packages); `uv sync` exit 0 (resolved 70 packages).

## Phase 0 — Step 2: Static checks

- Status: PASS
- Evidence: `npm run lint` exit 0 (ESLint 0 errors, Ruff all checks passed); `npm run typecheck` exit 0 (tsc clean web+api, mypy 22 source files clean).

## Phase 0 — Step 3: Tests and coverage

- Status: PASS
- Evidence: `npm run test` exit 0. Tests: web 40 passed (coverage 96.06%), api 35 passed (coverage 93.25%), ai 16 passed (coverage 90.98%). All >= 80%.

## Phase 0 — Step 4: Build

- Status: PASS
- Evidence: `npm run build` exit 0. Web bundle generated (index.html 1.06kB, css 24.68kB, JS bundle 389.70kB, lazy routes <5kB). API compiled to dist/.

## Phase 0 — Step 5: Live API proof

- Status: PASS
- Evidence: Real curls executed against live API server. GET /api/health -> 200 with X-Request-Id; GET /api/ready -> 503 envelope (DB disconnected); 404 envelope on unmapped route; POST with `$ne` -> 400 VALIDATION_ERROR envelope; invalid X-Request-Id replaced; Helmet headers confirmed, x-powered-by absent.

## Phase 0 — Step 6: Live AI service proof

- Status: PASS
- Evidence: Real curls executed against live FastAPI AI service. GET /health -> 200; /internal/ping -> 401 without token, 401 with wrong token, 200 with valid token; /nope -> 404 envelope; /docs in production mode -> 404 Not Found envelope.

## Phase 0 — Step 7: UI proof

- Status: PASS
- Evidence: Playwright browser verification passed with 0 console errors, 0 failed network requests, Skip to content link functional, landmarks present (<header>, <main id="main">, <footer>), primary touch targets >= 76px confirmed.

## Phase 0 — Step 8: Codebase hygiene check

- Status: PASS
- Evidence: 0 occurrences of `: any` / `as any` across TS code, 0 `console.log` statements in API/Web, 0 `localStorage`/`sessionStorage` in Web, 0 `print(` in AI Python code, 0 `TODO`/`FIXME` in code.

## Phase 1 — Step 1: Dependencies, env and config

- Status: PASS
- Evidence: `npm run typecheck -w apps/api` exit 0; `vitest run tests/env.test.ts` 3 passed (valid env parses, missing secrets fail with readable list, COOKIE_SECRET == JWT_ACCESS_SECRET fails). Full API suite 40 passed, 93.04% coverage.

## Phase 1 — Step 2: Data layer

- Status: PASS
- Evidence: `vitest run tests/repositories.test.ts` 6 passed (user upsert idempotent, duplicate email throws ConflictError, RefreshToken TTL index verified, AuditEvent strictly exposes ONLY create). Full API suite 46 passed, 94.83% coverage.

## Phase 1 — Step 3: Token and cookie services

- Status: PASS
- Evidence: `vitest run tests/tokens-and-cookies.test.ts` 11 passed (sign+verify OK, expired -> TOKEN_EXPIRED, tampered signature / wrong audience / wrong issuer / alg:none -> UNAUTHENTICATED, cookie flags match spec, clear cookies path parity). Full API suite 57 passed, 94.61% coverage.

## Phase 1 — Step 4: Refresh rotation, reuse detection, logout

- Status: PASS
- Evidence: `vitest run tests/session.service.test.ts` 9 passed (happy rotation, reuse within leeway -> REFRESH_RACE with family intact, reuse after leeway -> REFRESH_REUSED with family revoked, expired token, disabled user, concurrent 5x rotation -> 1 success 4 race, idempotent logout, logoutAll, zero plaintext tokens in DB). Full API suite 66 passed, 94.64% coverage.

## Phase 1 — Step 5: Google OAuth with Passport

- Status: PASS
- Evidence: Unit & stub tests passed in `tests/google-oauth.test.ts` (8 passed). Live curl against running server `GET /api/auth/google` returned 302 to https://accounts.google.com/ with client_id, state, openid email profile scopes, no access_type/token, and signed HttpOnly SameSite=Lax saath_oauth cookie. Full API suite 72 passed, 93.81% coverage.
