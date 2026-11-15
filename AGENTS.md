# AGENTS.md — Saath master rules (read before every task)

## Product

Saath is an elder-care and medication platform. The elder stays in control. The family
and doctor are kept informed. It is scored automatically on: Code Quality, Security,
Efficiency, Testing, Accessibility, Problem Statement Alignment.

## Stack (fixed, do not substitute)

- apps/web: React + Vite + TypeScript (strict), Tailwind CSS v4, TanStack Query, React Router
- apps/api: Node 20+, Express 5, TypeScript (strict), Mongoose, zod, pino
- apps/ai: Python 3.12, FastAPI, Pydantic v2, managed ONLY with uv (never pip, never requirements.txt)
- Database: MongoDB Atlas. Images/PDFs: Cloudinary (private). Voice: ElevenLabs. LLM: Gemini.
- Hosting: Netlify (web), Render free (api, ai). NO Docker. NO Google Cloud deploy.
- Tests: Vitest in web and api, pytest in ai. Lint: ESLint + Prettier (JS/TS), Ruff + mypy (Python).

## Hard rules

1. Never store JWTs or any token in localStorage, sessionStorage or JS-readable cookies.
   Tokens live only in httpOnly, Secure, SameSite cookies.
2. Never use `any` in TypeScript. Never use `# type: ignore` without a reason comment.
3. No secrets in code or git. All config comes from env, validated at startup (fail fast).
4. Every external input is validated: zod (api), Pydantic (ai), zod or typed guards (web).
5. Layering in api: routes -> controllers -> services -> repositories/models. Routes contain
   no logic. Controllers contain no DB calls. Services contain no req/res objects.
6. Layering in ai: routers -> services -> clients. Routers contain no business logic.
7. Every error is an AppError (api) / AppError (ai) with a stable machine code. All errors
   return the same JSON envelope (see "Error contract"). Never leak stack traces or internals
   to clients in production. Never swallow errors silently.
8. No `console.log` in api/ai code (use the logger). No `print` in Python. Never log secrets,
   tokens, passcodes, health data or full request bodies.
9. Every user-facing string that describes health data states what the document SAYS.
   The app NEVER diagnoses, never gives dosing advice, never says a person is "improving"
   or "worsening". AI output must be transcription, deterministic diff, or neutral wording
   ending in "Ask the doctor about this".
10. The elder confirms before any AI-extracted data is saved. AI failure must never block a
    core flow (always offer a manual fallback).
11. Accessibility is a requirement, not polish: WCAG 2.2 AA, base font 18px, primary touch
    targets >= 76 CSS px (about 20 mm), visible focus, aria-live for status changes,
    prefers-reduced-motion respected, no colour-only meaning.
12. Every feature ships with tests in the same phase. A phase is not done until
    lint, typecheck, test and build all pass in every app.
13. Do not add dependencies that are not needed. Pin to current stable versions. If unsure of
    an API, read the package's docs; do not guess method names.
14. Do not create files outside the agreed structure. Do not leave TODO comments, commented-out
    code, dead code or unused exports.
15. Keep files small: <= 200 lines per file where practical; functions do one thing.

## Error contract (identical in api and ai)

{ "error": { "code": "VALIDATION_ERROR", "message": "Human readable, safe",
"details": [ { "path": "email", "message": "Invalid email" } ],
"requestId": "uuid" } }
Status mapping: 400 validation, 401 unauthenticated, 403 forbidden, 404 not found,
409 conflict, 413 payload too large, 415 unsupported media type, 422 semantic,
429 rate limited, 502 upstream failed, 503 not ready / upstream down, 500 unexpected.
Every response carries an X-Request-Id header. Logs include the same requestId.

## Code style

- TS: strict, ESM, named exports, explicit return types on exported functions,
  `unknown` over `any`, early returns, no default exports except where a framework requires.
- Python: type hints everywhere, mypy strict, Ruff rules E,F,I,B,UP,S,C4,SIM,N.
- Names: files kebab-case (web/api), snake_case (ai). React components PascalCase.
- Comments explain WHY, never WHAT. Public functions get short docstrings/TSDoc.

## Definition of done (every phase)

- `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` pass at the root
- `uv run ruff check`, `uv run mypy`, `uv run pytest` pass in apps/ai
- New behaviour has tests, including failure paths
- Docs updated (docs/ folder) when behaviour or env vars change
- No secrets, no TODOs, no console.log, no unused code

## Verification protocol (mandatory, applies to every phase and every step)

Every phase prompt is split into numbered STEPS. Each step has a "Verify:" line.
You must follow this loop for EVERY step, in order:

1. BUILD the step.
2. RUN the step's Verify commands for real, in the terminal (and in the browser tool for UI steps).
3. SHOW the evidence in this exact format before starting the next step:

   ### STEP <n> RESULT — <step title>

   Status: PASS | FAIL | PASS WITH NOTES
   Commands run:
   - `<command>` -> <exit code> (paste the relevant last lines of REAL output, max 25 lines)
     What I checked:
   - <each acceptance item> : OK | FAILED (reason)
     Files created/changed: <list>
     What you (the human) can see now: <URL, command, or screenshot path to check it yourself>

4. LOG the same result as a short entry appended to docs/progress.md
   (date-less is fine: step number, title, status, command evidence summary).
5. If Status is FAIL: stop moving forward. Diagnose, fix, re-run Verify. Maximum 3 fix attempts.
   After 3 failed attempts, STOP and report: what fails, the exact error, what you tried, and your
   best hypothesis. Do not hide it and do not skip the step.

Honesty rules (violating these is the worst failure):

- NEVER claim a command passed unless you ran it in this session and saw the output.
- NEVER paste invented, abbreviated-to-look-green or "expected" output. If output is long, paste the
  last lines and the summary counts exactly as printed.
- NEVER weaken a test, lint rule, type setting or coverage threshold to make a check pass.
  Fix the code instead. If a rule is genuinely wrong, say so in the result and ask.
- NEVER mark a step PASS if any Verify item was not actually executed. Use PASS WITH NOTES and list
  what was not run and why.
- If a tool is unavailable (no browser, no network, missing credentials), say so plainly under
  Status and give the human the exact manual check to do.

UI steps: also open the running app in the browser tool, take a screenshot, and report what is
visible (layout, text, errors in the console). Console errors or failed network calls = FAIL.

API steps: also run real `curl` requests against the running server and show the status line, the
response body and the X-Request-Id header. Include at least one failure-path request per endpoint.

End of phase: after the last step, print a PHASE REPORT:

- Table: step | status | key evidence
- Output of the full check (`npm run check`) with the final summary lines
- Coverage numbers per app
- A "Manual verification for the human" list of at most 8 items, each a concrete action
  and the exact result to expect (for example: "open http://localhost:5173, press Tab once,
  expect a visible 'Skip to content' link")
- Known issues / deviations, each also recorded in docs/decisions.md
  Then STOP and wait. Do not start the next phase.

Progress log format (docs/progress.md, append only):

## Phase <n> — Step <m>: <title>

- Status: PASS
- Evidence: <one or two lines: commands and counts, e.g. "vitest 42 passed, coverage 86%">
