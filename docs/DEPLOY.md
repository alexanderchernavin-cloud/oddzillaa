# Deployment Runbook

Production deploy of a single oddzilla **instance** (A, B, C, …) on a Linux host, behind a reverse-proxy that terminates TLS. Each instance gets its own hostname prefix, Docker Compose project, ports, and volumes, so multiple instances can share one machine without interfering — see **Collaboration** in the root `README.md` for the port table.

## Prerequisites

- Docker & Docker Compose v2
- A reverse proxy on the host that owns :80 and :443. Caddy is recommended and `infra/caddy-oddzillaa.snippet` ships a ready-made site-block set.
- DNS A records for your instance pointing at the host:
  - `<prefix>.<domain>` — public frontend
  - `<prefix>admin.<domain>` — admin backoffice
  - `<prefix>api.<domain>` — API + Socket.IO
- Hostnames the browser uses are the values you set in `.env` (see below).

## 1. Clone and configure

```bash
git clone https://github.com/alexanderchernavin-cloud/oddzillaa.git oddzillaa-a
cd oddzillaa-a
cp .env.example .env
```

Edit `.env`. At minimum, set:

| Variable | Example (instance A) | Notes |
|---|---|---|
| `COMPOSE_PROJECT_NAME` | `oddzillaa` | Isolates containers, volumes, network. Unique per instance. |
| `WEB_PORT` | `7000` | Host port for Next.js, bound to `127.0.0.1`. |
| `API_PORT` | `7001` | Host port for NestJS, bound to `127.0.0.1`. |
| `WEB_ORIGIN` | `https://a.oddzilla.cc,https://aadmin.oddzilla.cc` | **Comma-separated** list of allowed browser origins. All hostnames that load web pages must be listed. |
| `NEXT_PUBLIC_API_URL` | `https://aapi.oddzilla.cc` | Baked into the Next.js client bundle at build time. The browser uses this URL for REST + Socket.IO. |
| `POSTGRES_PASSWORD` | `openssl rand -hex 24` | Long random. |
| `RABBITMQ_PASSWORD` | `openssl rand -hex 24` | Long random. |
| `JWT_ACCESS_SECRET` | `openssl rand -hex 32` | ≥ 32 chars. |
| `JWT_REFRESH_SECRET` | `openssl rand -hex 32` | ≥ 32 chars, different from access. |
| `ADMIN_EMAIL` | `admin@oddzilla.cc` | Seeded on first migrate; `mustChangePassword=true`. |
| `ADMIN_PASSWORD` | `openssl rand -hex 12` | One-time initial password. |
| `ENABLE_MOCK_FEED` | `true` until Oddin creds arrive | Generates synthetic odds. |
| `SHARED_EDGE_NETWORK` | `oddzilla_default` | Optional. External Docker network the reverse proxy can reach — `apia`/`weba` attach to it so the proxy can resolve them by name. If omitted, defaults to `oddzilla_default` for backward compatibility. |

```bash
chmod 600 .env
```

## 2. Build images

```bash
docker compose --env-file .env -f infra/docker-compose.prod.yml build
```

Builds `oddzillaa-apia` and `oddzillaa-weba`. `NEXT_PUBLIC_API_URL` is baked into the web image during this step — **rebuild `weba` whenever you change that value**.

## 3. Bring up datastores and migrate

```bash
# Start Postgres / Redis / RabbitMQ (not yet api/web)
docker compose --env-file .env -f infra/docker-compose.prod.yml up -d pg cache mq

# Wait for health (all three report 'healthy' within ~10s)
docker compose --env-file .env -f infra/docker-compose.prod.yml ps

# Apply migrations (uses the Prisma v5 binary bundled in the image;
# avoid `npx prisma` — it pulls in v7 and rejects the v5 schema)
docker compose --env-file .env -f infra/docker-compose.prod.yml run --rm \
  --entrypoint sh apia \
  -c "cd packages/db && ./node_modules/.bin/prisma migrate deploy"
```

## 4. Seed (first deploy only)

```bash
docker compose --env-file .env -f infra/docker-compose.prod.yml run --rm \
  --entrypoint sh apia \
  -c "cd packages/db && ./node_modules/.bin/tsx prisma/seed.ts"
```

Seeds 4 sports + synthetic categories, 2 Oddin producer placeholders, default admin settings, and the admin user from `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## 5. Start the app

```bash
docker compose --env-file .env -f infra/docker-compose.prod.yml up -d
```

Verify locally on the host:

```bash
curl -s http://127.0.0.1:${API_PORT}/api/health
# → {"status":"ok","checks":{"db":"ok","redis":"ok","rabbitmq":"ok"}}

curl -sI http://127.0.0.1:${WEB_PORT}/ | head -1
# → HTTP/1.1 200 OK
```

## 6. Reverse proxy — Caddy

If the host already runs a Caddy that serves another instance, append the site blocks from `infra/caddy-oddzillaa.snippet` to that Caddyfile. Edit the three hostnames at the top of each block to match your prefix.

`apia` and `weba` are attached to the external network named by `SHARED_EDGE_NETWORK` with stable aliases `${COMPOSE_PROJECT_NAME}-api` and `${COMPOSE_PROJECT_NAME}-web` so the snippet can `reverse_proxy` to them by name.

```bash
# Copy snippet, edit hostnames, append:
sudo cat infra/caddy-oddzillaa.snippet >> /path/to/Caddyfile

# Validate before applying:
docker exec <caddy-container> caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile

# Hot-reload if admin API is enabled, otherwise restart:
docker exec <caddy-container> caddy reload --config /etc/caddy/Caddyfile  # admin on
# or
docker restart <caddy-container>                                           # admin off
```

Caddy issues Let's Encrypt certs on first request to each hostname (takes a few seconds). Verify:

```bash
for h in a.oddzilla.cc aadmin.oddzilla.cc aapi.oddzilla.cc; do
  curl -sS -o /dev/null -w "$h  http=%{http_code}\n" --max-time 15 "https://$h/"
done
curl -s https://<prefix>api.<domain>/api/health
```

## Logs

```bash
docker compose --env-file .env -f infra/docker-compose.prod.yml logs -f apia
docker compose --env-file .env -f infra/docker-compose.prod.yml logs -f weba
```

## Rollback

```bash
# Stop this instance (volumes preserved)
docker compose --env-file .env -f infra/docker-compose.prod.yml down

# Check out the previous tag/commit and rebuild
git checkout <previous-commit>
docker compose --env-file .env -f infra/docker-compose.prod.yml build
docker compose --env-file .env -f infra/docker-compose.prod.yml up -d
```

Volumes (`${COMPOSE_PROJECT_NAME}_pgdata`, `_redisdata`, `_rabbitmqdata`) persist across `down`/`up`. To wipe an instance entirely:

```bash
docker compose --env-file .env -f infra/docker-compose.prod.yml down -v
```

## Running a second instance on the same host

Clone into a **separate directory** and pick a non-colliding port set and `COMPOSE_PROJECT_NAME`. The production port table mirrors the dev table from the root `README.md`:

| Variable | Instance A | Instance B | Instance C |
|---|---|---|---|
| `COMPOSE_PROJECT_NAME` | `oddzillaa` | `oddzillab` | `oddzillac` |
| `WEB_PORT` | 7000 | 7010 | 7020 |
| `API_PORT` | 7001 | 7011 | 7021 |
| Hostnames | `a.*`, `aadmin.*`, `aapi.*` | `b.*`, `badmin.*`, `bapi.*` | `c.*`, `cadmin.*`, `capi.*` |

Each instance gets its own Postgres, Redis, RabbitMQ — `pgdata`, `redisdata`, `rabbitmqdata` volumes are namespaced by the Compose project. The shared Caddy reverse-proxies by the explicit aliases, so there are no service-name collisions on the shared edge network.
