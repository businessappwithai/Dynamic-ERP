from fastapi import FastAPI

from app.catalog.cache import build_catalog
from app.routes import actions, catalog, schema


def create_app() -> FastAPI:
    app = FastAPI(title="ERPClaw Gateway", version="0.1.0")

    app.include_router(catalog.router)
    app.include_router(schema.router)
    app.include_router(actions.router)

    @app.on_event("startup")
    def _warm_catalog_cache() -> None:
        build_catalog()

    @app.get("/healthz")
    def healthz() -> dict:
        return {"status": "ok"}

    return app


app = create_app()
