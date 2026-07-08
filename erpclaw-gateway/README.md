# erpclaw-gateway

FastAPI gateway exposing erpclaw's action catalog, Postgres schema, and action
dispatch over HTTP. This is the "Gateway MVP" slice: `/api/v1/catalog`,
`/api/v1/actions/{domain}/{action}`, `/api/v1/schema/{entity}`, HS256 JWT auth.
No SSE events, no module provisioning, no real IdP — see the repo-root
implementation plan for what's deferred.

It does not reimplement erpclaw's execution logic — every action call shells
out to the unchanged `erpclaw/scripts/db_query.py` router via erpclaw's own
`mcp/tool_router.py`/`mcp/confirm.py` (loaded from `../erpclaw` at runtime, see
`app/erpclaw_bridge/loader.py`).

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

## Docker Compose

See the repo-root `docker-compose.yml` (Postgres + gateway only this slice).
