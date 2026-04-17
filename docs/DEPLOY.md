# Deployment Runbook

## Prerequisites

- Docker & Docker Compose installed
- `.env` file configured in project root with required secrets

## Required Environment Variables

| Variable | Description |
|---|---|
| `POSTGRES_PASSWORD` | PostgreSQL password |
| `JWT_ACCESS_SECRET` | JWT access token secret (min 32 chars) |
| `JWT_REFRESH_SECRET` | JWT refresh token secret (min 32 chars) |

## Build & Deploy

```bash
# 1. Build production images
docker compose -f infra/docker-compose.prod.yml build

# 2. Start infrastructure
docker compose -f infra/docker-compose.prod.yml up -d postgres redis rabbitmq

# 3. Run database migrations
docker compose -f infra/docker-compose.prod.yml run --rm api \
  npx prisma migrate deploy --schema=packages/db/prisma/schema.prisma

# 4. Seed initial data (first deploy only)
docker compose -f infra/docker-compose.prod.yml run --rm api \
  node packages/db/dist/seed.js

# 5. Start all services
docker compose -f infra/docker-compose.prod.yml up -d

# 6. Verify
curl http://localhost:3001/api/health
curl http://localhost:3000
```

## Rollback

```bash
# Stop services
docker compose -f infra/docker-compose.prod.yml down

# Rebuild with previous tag/commit
git checkout <previous-tag>
docker compose -f infra/docker-compose.prod.yml build
docker compose -f infra/docker-compose.prod.yml up -d
```

## Logs

```bash
docker compose -f infra/docker-compose.prod.yml logs -f api
docker compose -f infra/docker-compose.prod.yml logs -f web
```
