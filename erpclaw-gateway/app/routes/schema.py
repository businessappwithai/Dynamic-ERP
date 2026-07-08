from fastapi import APIRouter, Depends, HTTPException

from app.auth.jwt import Principal, verify_token
from app.schema.pg_introspect import entity_schema

router = APIRouter()


@router.get("/api/v1/schema/{entity}")
def get_schema(entity: str, _: Principal = Depends(verify_token)) -> dict:
    result = entity_schema(entity)
    if result is None:
        raise HTTPException(status_code=404, detail=f"No such entity/table: {entity!r}")
    return result
