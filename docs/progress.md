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

## Phase 1 — Step 6: Auth middleware, /me, logout, refresh, demo, limiter

- Status: PASS
- Evidence: `vitest run tests/auth-endpoints.test.ts` 8 passed. Full API suite 80 passed (coverage 92.82%). Real live curls confirmed CSRF rejection without `X-Saath-CSRF: 1` (403), demo login setting `saath_at` & `saath_rt` cookies (204), `GET /api/auth/me` (200), `POST /api/auth/refresh` rotating tokens & reuse detection after leeway (401 REFRESH_REUSED with family revoked), idempotent logout (204), demo 404 when disabled, and rate limiter 429 on attempt 21 with standard envelope and Retry-After.

## Phase 1 — Step 7: Frontend: apps/web

- Status: PASS
- Evidence: `npm run lint -w apps/web` exit 0 (forbidden localStorage/sessionStorage enforced); `npm run typecheck -w apps/web` exit 0; `npm run test -w apps/web` exit 0 (17 files passed, 65 tests passed, 95% statement coverage); `npm run build -w apps/web` exit 0. Live browser workflow in Microsoft Edge passed with 0 console runtime errors: /login (76px Google button, demo button), clicked demo transitioning to /app ("Welcome, Saath Demo User", UserMenu, card), opened UserMenu, clicked Sign out transitioning back to /login.

## Phase 1 — Step 8: Docs and config

- Status: PASS
- Evidence: `node scratch/verify-step8-env.mjs` exit 0 (16/16 env keys in apps/api/.env.example verified across docs/deployment.md, render.yaml, and env.ts). Docs updated: docs/security.md (threat model, rotation, leeway, reuse detection, OAuth CSRF, append-only audit trail); docs/architecture.md (Mermaid sequence diagram for login/init/refresh/logout); docs/error-handling.md (8 new machine error codes in master table); docs/decisions.md (ADRs 008-011). Zero TODOs/placeholders in docs.

## Phase 1 — Step 9: Full check and phase report

- Status: PASS
- Evidence: `npm run check` exit 0 (lint, typecheck, test, build across all apps). Coverage: web 95%, api 92.82%, ai 90.98%. Hygiene: 0 `any`, 0 `console.log`, 0 `localStorage`/`sessionStorage`, 0 `print(`, 0 `TODO`/`FIXME`. Pushed 8 commits to origin main (8f4cd61..4e28c23).

## Phase 2–5 — Step 1: Env, deps, models, repositories, access middleware

- Status: PASS
- Evidence: `npm run typecheck -w apps/api` exit 0; `vitest run --no-coverage tests/care-models-and-repos.test.ts tests/access-middleware.test.ts` 15 passed; all models, indexes, and repositories verified.
