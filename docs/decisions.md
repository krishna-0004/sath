# Architecture Decision Records (ADRs)

## ADR 001: No Docker anywhere (Native Runtimes)

- **Status:** Accepted
- **Context:** Render free tier and CI support native Node.js 20 and Python 3.12 environments without containerization overhead. Docker builds add significant memory and startup latency on free instances.
- **Decision:** Saath deploys `apps/web` on Netlify, and `apps/api` (Node runtime) and `apps/ai` (Python runtime) on Render native free web services. No Dockerfiles or container manifests exist anywhere in the repository.
- **Consequences:** Faster build and deployment cycles; reduced configuration drift; seamless free-tier sleeping and wake-up mechanics.

## ADR 002: Netlify Proxy Rewrite for First-Party Cookies

- **Status:** Accepted
- **Context:** Modern browsers increasingly restrict or partition third-party cookies (SameSite restrictions, storage access API, tracking protection). A separate domain for the API causes cross-site cookie challenges.
- **Decision:** In production, the browser only talks directly to Netlify. Netlify proxies `/api/*` to the Render API web service via an HTTP 200 rewrite rule (`force = true`). In local development, Vite dev server proxies `/api` to `http://localhost:4000`. The frontend client code never hardcodes or references an absolute API URL.
- **Consequences:** Authentication cookies remain first-party (`SameSite=Lax` or `Strict`, `httpOnly`, `Secure`). Cross-origin cookie issues are completely eliminated.

## ADR 003: Express 5 and Custom Rejecting SQL/NoSQL Injection Middleware

- **Status:** Accepted
- **Context:** Express 5 makes `req.query` a read-only getter, which causes popular legacy sanitization libraries such as `express-mongo-sanitize` to throw errors upon attempted mutation.
- **Decision:** Implement a lightweight custom middleware (`no-sql-injection.ts`) that inspects `req.body`, `req.query`, and `req.params`. Instead of attempting in-place object mutation, the middleware immediately REJECTS any request containing keys starting with `$` or containing `.` with an HTTP 400 `VALIDATION_ERROR` response.
- **Consequences:** Fully compatible with Express 5; avoids unexpected side effects from mutating request payloads; eliminates NoSQL operator injection attacks at the perimeter.

## ADR 004: Python Dependency Management with UV Only

- **Status:** Accepted
- **Context:** Python package management with pip and requirements.txt lacks deterministic dependency resolution, speed, and lockfile reproducibility.
- **Decision:** `apps/ai` is managed exclusively with `uv` (Astral). No `pip install` commands or `requirements.txt` files are used in development or CI. Render bootstrap uses `pip install uv` once solely to acquire the uv binary.
- **Consequences:** Millisecond-level resolution and installation; committed `uv.lock` ensures identical dependencies across local environments, CI, and production.

## ADR 005: Tailwind CSS v4 CSS-First Tokens

- **Status:** Accepted
- **Context:** Tailwind CSS v4 removes the legacy `tailwind.config.js` in favor of a modern CSS-first configuration via `@theme` directives.
- **Decision:** Configure design system tokens (primary teal, amber accent, emergency high-contrast red, touch target sizes, typography) directly in `apps/web/src/index.css` using `@theme` and standard CSS custom properties. Include high-contrast theme overrides for accessibility.
- **Consequences:** Eliminates duplicate configuration files; speeds up Vite HMR; enables native CSS variable consumption in UI components.

## ADR 006: Gmail API Over SMTP

- **Status:** Accepted
- **Context:** Traditional SMTP connections are frequently throttled, flagged as suspicious, or blocked by cloud providers like Render.
- **Decision:** Family notifications and automated email dispatches will use Google Workspace / Gmail REST API with OAuth2 / service credentials rather than SMTP.
- **Consequences:** High deliverability; immune to port 25/587 cloud egress blocks; structured error codes.

## ADR 007: Cron-Job.org Tick Architecture for Scheduled Tasks

- **Status:** Accepted
- **Context:** Render free web services spin down after 15 minutes of inactivity, terminating internal node-cron or background timers.
- **Decision:** Background recurring checks (e.g., medication window checks, reminder ticks) are triggered by external HTTPS webhooks (cron-job.org) hitting `/api/internal/tick` protected by a high-entropy `TICK_SECRET`.
- **Consequences:** Guarantees timely execution regardless of instance sleep states; wakes sleeping dynos reliably when scheduled actions are due.
