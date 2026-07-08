from fastapi import APIRouter, Depends

from app.auth.jwt import Principal, verify_token
from app.catalog.cache import build_catalog

router = APIRouter()


@router.get("/api/v1/catalog")
def get_catalog(_: Principal = Depends(verify_token)) -> dict:
    return build_catalog()
