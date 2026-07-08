# erpclaw-gateway

FastAPI gateway exposing erpclaw's action catalog, Postgres schema, and action
dispatch over HTTP: `/api/v1/catalog`, `/api/v1/actions/{domain}/{action}`,
`/api/v1/schema/{entity}`, `/api/v1/events` (SSE), `/api/v1/modules/provision`,
HS256 JWT auth. Real per-action/per-role RBAC and a real external IdP/JWKS
verifier are still deferred — see the repo-root implementation plan.

It does not reimplement erpclaw's execution logic — every action call (and
module-provisioning call) shells out to the unchanged
`erpclaw/scripts/db_query.py` router via erpclaw's own
`mcp/tool_router.py`/`mcp/confirm.py` (loaded from `../erpclaw` at runtime, see
`app/erpclaw_bridge/loader.py`).

## Real-time events

`GET /api/v1/events` is a Server-Sent Events stream of gateway activity —
currently `action.dispatched` (from `/api/v1/actions/*`) and
`module.provisioned` (from `/api/v1/modules/provision`), plus a `ping`
heartbeat every 15s. Requires a valid bearer token (any scope — this is a
read/observe capability, not gated by `JWT_REQUIRED_SCOPE`). Backed by an
in-process `asyncio.Queue` fan-out (`app/events/bus.py`); a future
multi-worker deployment would swap this for Postgres LISTEN/NOTIFY or a real
broker without changing the route.

```bash
curl -N -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/events
```

## Module provisioning

`POST /api/v1/modules/provision` installs an erpclaw expansion module.
Module-lifecycle actions (`install-module`, `list-modules`, ...) are excluded
from the action catalog — they don't belong to any `erpclaw-*` domain, so
`/api/v1/actions/{domain}/{action}` can't reach them — but erpclaw's own
router already forwards them to `module_manager.py`. This route dispatches
`install-module` through the same `tool_router.dispatch()` as the actions
route, so it inherits the same destructive-action confirmation gate
(`confirmation_required` → `409` until you resend with `user_confirmed: true`).

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  http://localhost:8000/api/v1/modules/provision \
  -d '{"module_name": "healthclaw", "user_confirmed": true}'
```

## Environment variables

| Var | Required | Purpose |
|---|---|---|
| `ERPCLAW_DB_URL` | yes | Postgres connection string, forwarded to the erpclaw subprocess and used directly for schema introspection |
| `ERPCLAW_REPO_ROOT` | no (defaults to `../erpclaw`) | Path to the merged erpclaw checkout |
| `ERPCLAW_HOME` | no | erpclaw install root; forwarded to the subprocess like any erpclaw deployment |
| `JWT_SECRET` | no (dev default, change for anything real) | HS256 signing secret for both verification and `mint_test_token` |
| `JWT_REQUIRED_SCOPE` | no (default `erpclaw:invoke`) | Scope string required on `/api/v1/actions/*` calls |

## Local run (no Docker)

```bash
cd erpclaw-gateway
pip install -e .
pip install -r ../erpclaw/requirements.txt
export ERPCLAW_DB_URL=postgresql://erpclaw:erpclaw_dev_password@localhost:5432/erpclaw
uvicorn app.main:app --reload
```

## Minting a test token

```bash
python -m app.auth.mint_test_token --sub tester --scope erpclaw:invoke
```

Prints a raw JWT to stdout — use it directly: `TOKEN=$(python -m app.auth.mint_test_token ...)`.

## Running tests

```bash
pip install -e ".[dev]"
pytest
```

## Docker Compose

See the repo-root `docker-compose.yml` (Postgres + gateway only this slice).
