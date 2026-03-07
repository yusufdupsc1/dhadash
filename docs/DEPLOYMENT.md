# Deployment Guide

This runbook describes how to deploy BD-GPS safely.

## 1) Deployment Targets

- Managed: Vercel
- Self-hosted: Docker / Docker Compose

## 2) Pre-Deployment Checklist

- Configure all required environment variables.
- Provision PostgreSQL and verify connectivity.
- Run schema migration plan in staging first.
- Validate CI checks: lint, type-check, tests, build.

## 3) Environment Variables

Reference: `.env.example`

Minimum required:

- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXT_PUBLIC_APP_URL`

Integrations (optional but recommended in production):

- Stripe keys + webhook secret
- UploadThing keys
- Resend API key

## 4) Vercel Deployment

CI workflow contains an optional deploy job for `main`.

Expected secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Also configure app runtime variables in Vercel project settings.

## 5) Docker Deployment

### Build image

```bash
docker build -t bd-gps:latest .
```

### GitHub Actions container publishing (GHCR + Docker Hub)

The CI pipeline now always pushes to GHCR and only pushes to Docker Hub when credentials are configured.

Required repository secrets for Docker Hub push:

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN` (recommended: Docker Hub access token, not account password)
- `DOCKERHUB_IMAGE` (optional override, e.g. `bd-gps1` or `yusufdupsc1/bd-gps`)

Notes:

- Image names are normalized to lowercase automatically in CI (prevents invalid tag failures).
- If Docker Hub secrets are missing, CI logs a notice and skips Docker Hub push without failing the workflow.
- GHCR push still runs using `GITHUB_TOKEN`.
- If `DOCKERHUB_IMAGE` is set, CI uses it instead of GitHub repository name.

Example resulting images:

- `ghcr.io/<owner>/<repo>:latest`
- `<dockerhub-username>/<repo>:latest` (if Docker Hub secrets are present)

### Run full stack

```bash
docker compose up -d --build
```

Services:

- `app` (Next.js)
- `postgres`
- `redis`
- `migrate` (one-shot migration/seed)

## 6) Health Verification

After deploy:

```bash
curl -i http://localhost:3000/api/health
```

Expected: `200 OK` with `{"status":"ok"...}`.

## 7) Rollback Strategy

- Vercel: redeploy last known-good build.
- Docker: roll back to previous image tag.
- Database: migrations should be forward-safe; test rollback path before production schema changes.

## 8) Operational Recommendations

- Use external managed PostgreSQL with backups.
- Enable structured logs and external alerting.
- Rotate secrets regularly and never store them in Git.
- Run deployment from immutable CI artifacts only.
