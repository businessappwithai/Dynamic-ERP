from fastapi import APIRouter, Depends, HTTPException

from app.auth.jwt import Principal, verify_token
from app.schema.pg_introspect import entity_schema, list_entities

router = APIRouter()


@router.get("/api/v1/entities")
def get_entities(_: Principal = Depends(verify_token)) -> dict:
    """All real (non-bookkeeping) tables — the entity list a dictionary-sync
    consumer needs before it can call /schema/{entity} per table."""
    return {"entities": list_entities()}


@router.get("/api/v1/schema/{entity}")
def get_schema(entity: str, _: Principal = Depends(verify_token)) -> dict:
    result = entity_schema(entity)
    if result is None:
        raise HTTPException(status_code=404, detail=f"No such entity/table: {entity!r}")
    return result
