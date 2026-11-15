# Deployment Guide

This guide details deployment of Saath to Netlify (frontend SPA) and Render (backend API and AI services), backed by MongoDB Atlas M0.

## 1. MongoDB Atlas Setup (Free M0)

1. Create a free M0 cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a database user with read/write privileges to the `saath` database.
3. In Network Access, add IP address `0.0.0.0/0` (allow access from anywhere) so Render dynos can connect dynamically.
4. Copy the SRV connection URI:
   ```text
   mongodb+srv://<username>:<password>@<cluster>.mongodb.net/saath?retryWrites=true&w=majority
   ```

## 2. Render Deployment (Blueprint via `render.yaml`)

Both backend services deploy natively on Render's free tier without Docker.

1. Connect your GitHub repository on [Render Dashboard](https://dashboard.render.com).
2. Choose **New > Blueprint** and point to the repository. Render will automatically parse `render.yaml`.
3. Configure the environment variables in the Render Dashboard for each service:

### `saath-api` Environment Variables

| Variable                       | Value / Description                                            | Secret? | Generation / Origin                                            |
| ------------------------------ | -------------------------------------------------------------- | ------- | -------------------------------------------------------------- |
| `NODE_ENV`                     | `production`                                                   | No      | Fixed runtime mode                                             |
| `PORT`                         | `4000`                                                         | No      | Render port                                                    |
| `LOG_LEVEL`                    | `info`                                                         | No      | Structured logging level                                       |
| `MONGODB_URI`                  | Atlas connection string                                        | **Yes** | MongoDB Atlas connection string                                |
| `CLIENT_ORIGIN`                | Netlify production URL (e.g. `https://saath-care.netlify.app`) | No      | Netlify app origin                                             |
| `AI_SERVICE_URL`               | Render AI URL (e.g. `https://saath-ai.onrender.com`)           | No      | Render internal or public URL                                  |
| `AI_SERVICE_TOKEN`             | 32+ char token                                                 | **Yes** | `openssl rand -hex 32`                                         |
| `GOOGLE_CLIENT_ID`             | Google OAuth Client ID                                         | **Yes** | Google Cloud Console OAuth 2.0 Web Client                      |
| `GOOGLE_CLIENT_SECRET`         | Google OAuth Client Secret                                     | **Yes** | Google Cloud Console OAuth 2.0 Web Client                      |
| `GOOGLE_CALLBACK_URL`          | Production redirect URI                                        | No      | e.g. `https://saath-care.netlify.app/api/auth/google/callback` |
| `JWT_ACCESS_SECRET`            | 32+ char secret for HS256 access tokens                        | **Yes** | `openssl rand -hex 32`                                         |
| `COOKIE_SECRET`                | 32+ char cookie signing secret (must != JWT)                   | **Yes** | `openssl rand -hex 32`                                         |
| `ACCESS_TOKEN_TTL_SECONDS`     | Access token lifespan (default: `900`)                         | No      | Number in seconds (15 min)                                     |
| `REFRESH_TOKEN_TTL_DAYS`       | Refresh token lifespan (default: `7`)                          | No      | Number in days (7 days)                                        |
| `REFRESH_REUSE_LEEWAY_SECONDS` | Concurrency race leeway (default: `10`)                        | No      | Number in seconds (10s)                                        |
| `DEMO_LOGIN_ENABLED`           | Demo account login toggle (default: `false`)                   | No      | `false` in production, `true` in dev                           |

### `saath-ai` Environment Variables

| Variable           | Value / Description                  | Secret?            |
| ------------------ | ------------------------------------ | ------------------ |
| `ENVIRONMENT`      | `production`                         | No                 |
| `LOG_LEVEL`        | `info`                               | No                 |
| `AI_SERVICE_TOKEN` | Identical token matching `saath-api` | **Yes**            |
| `GEMINI_API_KEY`   | Google AI Studio Gemini API Key      | **Yes** (Phase 2+) |

## 3. Netlify Deployment (Frontend SPA)

1. Connect the GitHub repository in [Netlify Dashboard](https://app.netlify.com).
2. Configure build settings:
   - **Base directory**: `.` (or leave empty)
   - **Build command**: `npm run build -w apps/web`
   - **Publish directory**: `apps/web/dist`
3. Environment variables:
   - `NODE_VERSION`: `20`
4. Verify `apps/web/netlify.toml` handles the status 200 proxy rewrite:
   ```toml
   [[redirects]]
     from = "/api/*"
     to = "https://saath-api.onrender.com/api/:splat"
     status = 200
     force = true

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

## 4. Render Free-Tier Characteristics & Server Warmup

- **15-Minute Inactivity Sleep**: Free web services on Render sleep after 15 minutes of receiving no incoming HTTP requests.
- **Spin-Up Latency**: Waking a sleeping instance takes between 45 and 90 seconds.
- **750 Monthly Free Hours**: Render grants 750 shared hours per month across free instances. **Do NOT ping the service 24/7**, as doing so exhausts monthly hours prematurely.
- **Client Mitigation (`ServerWakingBanner`)**:
  When a user opens the web application, `useServerWarmup` calls `GET /api/health`. If the request takes longer than 3 seconds, a polite message informs the user:
  _"Waking up the server, this can take up to a minute."_
  Once the server responds with 200 OK, the banner dismisses smoothly.

## 5. Pre-Judging & Demonstration Checklist

Before presenting or evaluating the live deployment:

- [ ] Send an initial warmup curl to `https://<your-netlify-site>/api/health` 2 minutes prior to judging to ensure Render dynos are awake.
- [ ] Confirm `/api/health` returns status 200 with JSON `{ "status": "ok", "uptime": ... }`.
- [ ] Confirm `/api/ready` returns 200 indicating successful MongoDB Atlas connectivity.
- [ ] Open the Netlify web app URL in a browser: verify landing page renders with no console errors and the warmup banner hides once healthy.
- [ ] Inspect response headers in Network tab to confirm security headers (`Content-Security-Policy`, `X-Content-Type-Options: nosniff`) and absence of `x-powered-by`.
