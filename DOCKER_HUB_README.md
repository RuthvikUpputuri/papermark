# Papermark (Community Docker Image)

This image bundles the open-source edition of [Papermark](https://github.com/mfts/papermark) for self-hosting. It is built and published by `ruthvikupputuri` as a community convenience image (`docker.io/ruthvikupputuri/papermark`) and is **not an official build from the Papermark maintainers**. The image targets `linux/amd64` and `linux/arm64`, aligns with Node.js 20 LTS, and ships with the production Next.js build plus Prisma migrations ready to run at container start.

Papermark is distributed under the terms described in the upstream repository. Portions of the project are AGPLv3-licensed, while commercial modules that live under `ee/` in the upstream project remain under the Papermark commercial license. Review the upstream LICENSE files before deploying this container in production and ensure you comply with all obligations (including offering source to network users when required by AGPLv3).

## Quick Start

```bash
docker run -p 3000:3000 \
  --env-file .env \
  --name papermark \
  docker.io/ruthvikupputuri/papermark:latest
```

For a complete stack (Next.js app + PostgreSQL + MinIO as the S3-compatible backend), use the Compose file below. It mirrors the configuration in `docker-compose.yml` from this repository.

```yaml
version: "3.9"
services:
  app:
    image: docker.io/ruthvikupputuri/papermark:latest
    env_file:
      - .env
    environment:
      - NODE_ENV=production
      - NEXT_TELEMETRY_DISABLED=1
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      minio:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: papermark
      POSTGRES_PASSWORD: papermark
      POSTGRES_DB: papermark
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U papermark"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  minio:
    image: quay.io/minio/minio:RELEASE.2024-10-13T13-34-11Z
    command: server /data --console-address ":9090"
    environment:
      MINIO_ROOT_USER: papermark
      MINIO_ROOT_PASSWORD: papermarksecret
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"
      - "9090:9090"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 10s
      retries: 5
    restart: unless-stopped

volumes:
  postgres_data:
  minio_data:
```

## Environment Template

Copy `.env.example` from the repository (or reuse the `.env` you already configured for development) and ensure it contains the production-ready values below. Values marked as optional can be left blank; the image includes fallbacks that disable those integrations gracefully (Slack, Hanko passkeys, Upstash Redis, QStash, Resend, etc.).

```dotenv
# Core URLs
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_MARKETING_URL=http://localhost:3000
NEXT_PUBLIC_APP_BASE_HOST=localhost

# Secrets (generate strong random strings)
NEXTAUTH_SECRET=change-me
NEXT_PRIVATE_DOCUMENT_PASSWORD_KEY=change-me
NEXT_PRIVATE_VERIFICATION_SECRET=change-me
INTERNAL_API_KEY=change-me

# Database (points at the bundled Postgres service)
POSTGRES_PRISMA_URL=postgresql://papermark:papermark@postgres:5432/papermark?schema=public
POSTGRES_PRISMA_URL_NON_POOLING=postgresql://papermark:papermark@postgres:5432/papermark?schema=public
# POSTGRES_PRISMA_SHADOW_URL=postgresql://papermark:papermark@postgres:5432/papermark_shadow?schema=public
DATABASE_URL=${POSTGRES_PRISMA_URL_NON_POOLING}

# Storage (defaults to MinIO service)
NEXT_PUBLIC_UPLOAD_TRANSPORT="s3"
NEXT_PRIVATE_UPLOAD_ENDPOINT=http://minio:9000
NEXT_PRIVATE_UPLOAD_BUCKET=papermark
NEXT_PRIVATE_UPLOAD_REGION=us-east-1
NEXT_PRIVATE_UPLOAD_ACCESS_KEY_ID=papermark
NEXT_PRIVATE_UPLOAD_SECRET_ACCESS_KEY=papermarksecret
NEXT_PRIVATE_UPLOAD_DISTRIBUTION_HOST=localhost
NEXT_PRIVATE_UPLOAD_DISTRIBUTION_DOMAIN=
NEXT_PRIVATE_UPLOAD_DISTRIBUTION_KEY_ID=
NEXT_PRIVATE_UPLOAD_DISTRIBUTION_KEY_CONTENTS=
BLOB_READ_WRITE_TOKEN=

# Optional email & queue providers
RESEND_API_KEY=
QSTASH_TOKEN=
QSTASH_CURRENT_SIGNING_KEY=
QSTASH_NEXT_SIGNING_KEY=

# Optional Slack app & webhooks
SLACK_APP_INSTALL_URL=
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_INTEGRATION_ID=
PPMK_SLACK_WEBHOOK_URL=
PPMK_TRIAL_SLACK_WEBHOOK_URL=

# Optional OAuth providers
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=

# Optional passkey (Hanko) integration
HANKO_API_KEY=
NEXT_PUBLIC_HANKO_TENANT_ID=

# Misc optional providers
PROJECT_ID_VERCEL=
TEAM_ID_VERCEL=
AUTH_BEARER_TOKEN=
TRIGGER_SECRET_KEY=
TRIGGER_API_URL=https://api.trigger.dev
NEXT_PUBLIC_WEBHOOK_BASE_URL=
NEXT_PUBLIC_WEBHOOK_BASE_HOST=

# Optional Redis REST (Upstash) credentials – leave blank to use in-memory fallback
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
UPSTASH_REDIS_REST_LOCKER_URL=
UPSTASH_REDIS_REST_LOCKER_TOKEN=
```

### Optional Integrations

* **Slack notifications** – remain disabled unless `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, and related webhook settings are supplied; the image logs a warning but continues.
* **Passkeys (Hanko)** – the passkey provider is only registered when both `HANKO_API_KEY` and `NEXT_PUBLIC_HANKO_TENANT_ID` are set.
* **Upstash Redis / rate limiting** – when the REST credentials are omitted, the app falls back to an in-memory store suitable for single-instance deployments.
* **QStash background jobs, Resend email, Trigger.dev, OAuth providers** – all optional; endpoints short-circuit gracefully when the corresponding env vars are missing.
* For a broader walk-through of environment groups (core URLs, database, storage, optional services) refer to the project `README.md`.

## Publishing Notes

The `docker.io/ruthvikupputuri/papermark` image is built from this repository’s Dockerfile via `docker buildx build --platform linux/amd64,linux/arm64 --push`. It prunes dev dependencies, runs Prisma migrations during container startup, and starts the production Next.js server (`next start`).

To rebuild and push an updated tag yourself:

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t docker.io/ruthvikupputuri/papermark:latest \
  --push .
```

Consider pinning the upstream Git commit and tagging the Docker image accordingly for reproducible deployments.

## Attribution & Legal

* Original project: [https://github.com/mfts/papermark](https://github.com/mfts/papermark)
* Original authors: Papermark, Inc. and contributors.
* License: Portions AGPLv3; enterprise modules under separate commercial terms. See upstream `LICENSE` and `ee/LICENSE`.
* This repository contains local modifications (Docker optimisations, optional integration fallbacks, compose scaffolding). When running the software publicly, comply with AGPLv3 by providing corresponding source code for any modifications and by preserving all notices.
* Trademark/copyright: "Papermark" and any associated marks belong to their respective owners. This community image is provided as-is with no warranty and is not endorsed by the upstream maintainers.

Always review the upstream repository and licenses to ensure your deployment meets legal obligations. If you require commercial licensing or support, contact the Papermark team directly via the upstream project.
